'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('../config/workflowEngineFlags');
const bpmnRegistry = require('../bpmn/bpmnDefinitionRegistry');
const stateMachine = require('../stateMachine/stateMachineEngine');
const graph = require('../graph/executionGraphService');
const audit = require('../audit/workflowAuditTracer');
const approvalChain = require('../hitl/approvalChainService');
const compensation = require('../compensation/compensationService');
const backbone = require('../integration/workflowBackboneEvents');

async function ensureDefinitionRow(definition) {
  const db = require('../../db');
  const existing = await db.query(
    `SELECT id FROM industrial_workflow_definitions
     WHERE process_key = $1 AND version = $2 AND company_id IS NULL LIMIT 1`,
    [definition.process_key, definition.version]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const id = uuidv4();
  await db.query(
    `INSERT INTO industrial_workflow_definitions
     (id, process_key, version, company_id, bpmn_definition, state_machine, metadata)
     VALUES ($1::uuid,$2,$3,NULL,$4::jsonb,$5::jsonb,$6::jsonb)`,
    [
      id,
      definition.process_key,
      definition.version,
      JSON.stringify(definition.bpmn),
      JSON.stringify(definition.state_machine),
      JSON.stringify({ builtin: true })
    ]
  );
  return id;
}

async function startWorkflow({ processKey, companyId, userId, user, context = {}, correlationId }) {
  if (!flags.shouldUseWorkflowEngine(companyId)) {
    return { ok: false, reason: 'workflow_engine_inactive' };
  }

  if (user) {
    const permissionGate = require('../permission/workflowPermissionGate');
    const perm = permissionGate.assertWorkflowPermission({
      user,
      processKey,
      companyId,
      capabilities: user.permissions,
    });
    if (!perm.ok) return perm;
  }

  const definition = bpmnRegistry.getDefinition(processKey, 1);
  if (!definition) return { ok: false, reason: 'unknown_process' };

  const corr = correlationId || `wf-${uuidv4()}`;
  const initial = stateMachine.getInitialState(definition);
  const mode = flags.workflowEngineMode();

  if (flags.isShadowMode()) {
    return {
      ok: true,
      shadow: true,
      process_key: processKey,
      correlation_id: corr,
      current_state: initial,
      message: '[Shadow] Workflow simulado — sem persistência.'
    };
  }

  const defId = await ensureDefinitionRow(definition);
  const instanceId = uuidv4();

  const db = require('../../db');
  await db.query(
    `INSERT INTO industrial_workflow_instances
     (id, company_id, definition_id, process_key, correlation_id, current_state, status, context, execution_mode, requested_by_user_id)
     VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,'running',$7::jsonb,$8,$9::uuid)`,
    [
      instanceId,
      companyId,
      defId,
      processKey,
      corr,
      initial,
      JSON.stringify(context),
      mode,
      userId || null
    ]
  );

  await graph.appendNode({
    instanceId,
    companyId,
    nodeId: definition.bpmn.startEvent,
    nodeType: 'start',
    status: 'completed',
    sequenceNo: 1,
    inputSnapshot: context
  });

  await audit.recordAudit({
    instanceId,
    companyId,
    eventType: 'started',
    fromState: null,
    toState: initial,
    actorUserId: userId,
    payload: { process_key: processKey, correlation_id: corr }
  });

  backbone.publishWorkflowEvent('governance.workflow.started', {
    companyId,
    correlationId: corr,
    payload: { instance_id: instanceId, process_key: processKey }
  });

  const submit = await signalWorkflow({
    instanceId,
    companyId,
    userId,
    event: 'SUBMIT',
    payload: context
  });

  return {
    ok: true,
    instance_id: instanceId,
    correlation_id: corr,
    current_state: submit.to || submit.current_state || initial,
    process_key: processKey,
    mode
  };
}

async function signalWorkflow({ instanceId, companyId, userId, event, payload = {} }) {
  if (!flags.shouldUseWorkflowEngine(companyId)) {
    return { ok: false, reason: 'workflow_engine_inactive' };
  }

  const db = require('../../db');
  const instR = await db.query(
    `SELECT * FROM industrial_workflow_instances WHERE id = $1::uuid AND company_id = $2::uuid`,
    [instanceId, companyId]
  );
  const instance = instR.rows[0];
  if (!instance) return { ok: false, reason: 'not_found' };
  if (instance.status !== 'running') return { ok: false, reason: 'not_running', status: instance.status };

  const definition = bpmnRegistry.getDefinition(instance.process_key, 1);
  const fromState = instance.current_state;

  if (flags.isShadowMode()) {
    const sim = stateMachine.applyTransition(definition, fromState, event, payload);
    return { ok: sim.ok, shadow: true, ...sim };
  }

  const transition = stateMachine.applyTransition(definition, fromState, event, payload);
  if (!transition.ok) return transition;

  const seqR = await db.query(
    `SELECT COALESCE(MAX(sequence_no),0)+1 AS next FROM industrial_workflow_execution_graph WHERE instance_id = $1::uuid`,
    [instanceId]
  );
  const seq = seqR.rows[0]?.next || 2;

  await graph.appendNode({
    instanceId,
    companyId,
    nodeId: `${fromState}->${event}`,
    nodeType: 'transition',
    status: flags.allowsRealExecution() ? 'completed' : 'audit_only',
    sequenceNo: seq,
    inputSnapshot: { event, payload },
    outputSnapshot: { to: transition.to }
  });

  let approvalStep = null;
  if (event === 'SUBMIT' && transition.to === 'pending_approval') {
    approvalStep = await approvalChain.createApprovalStep({
      instanceId,
      companyId,
      stepIndex: 1,
      nodeId: 'supervisor_gate',
      requiredHierarchy: 4,
      explainability: { summary: 'Aprovação supervisor obrigatória', process_key: instance.process_key }
    });
  }

  const executeReal = flags.allowsRealExecution();
  const auditOnly = flags.isAuditMode() && !executeReal;

  if (auditOnly && ['EXECUTE', 'COMPLETE'].includes(event)) {
    await audit.recordAudit({
      instanceId,
      companyId,
      eventType: 'audit_blocked_execution',
      fromState,
      toState: transition.to,
      actorUserId: userId,
      payload: { event, audit_only: true }
    });
  }

  await db.query(
    `UPDATE industrial_workflow_instances
     SET current_state = $3, updated_at = now(),
         status = CASE WHEN $4 THEN 'completed' ELSE status END,
         completed_at = CASE WHEN $4 THEN now() ELSE completed_at END
     WHERE id = $1::uuid AND company_id = $2::uuid`,
    [instanceId, companyId, transition.to, transition.terminal]
  );

  await audit.recordAudit({
    instanceId,
    companyId,
    eventType: 'transition',
    fromState,
    toState: transition.to,
    actorUserId: userId,
    payload: { event, transition_id: transition.transition_id, audit_only: auditOnly }
  });

  backbone.publishWorkflowEvent('governance.workflow.transitioned', {
    companyId,
    correlationId: instance.correlation_id,
    payload: { instance_id: instanceId, from: fromState, to: transition.to, event }
  });

  if (transition.terminal) {
    backbone.publishWorkflowEvent('governance.workflow.completed', {
      companyId,
      correlationId: instance.correlation_id,
      payload: { instance_id: instanceId, final_state: transition.to }
    });
  }

  return {
    ok: true,
    instance_id: instanceId,
    from: fromState,
    to: transition.to,
    event,
    terminal: transition.terminal,
    approval_step: approvalStep,
    audit_only: auditOnly
  };
}

async function approveWorkflowStep(approvalId, companyId, userId) {
  const decision = await approvalChain.decide(approvalId, companyId, userId, 'approve', null);
  if (!decision.ok) return decision;

  const instId = decision.approval.instance_id;
  const sig = await signalWorkflow({ instanceId: instId, companyId, userId, event: 'APPROVE' });
  if (!sig.ok) return sig;

  if (flags.allowsRealExecution()) {
    return signalWorkflow({ instanceId: instId, companyId, userId, event: 'EXECUTE' });
  }
  if (flags.isAuditMode()) {
    return { ok: true, status: 'audit_approved_not_executed', instance_id: instId, ...sig };
  }
  return sig;
}

async function rejectWorkflowStep(approvalId, companyId, userId, reason) {
  const decision = await approvalChain.decide(approvalId, companyId, userId, 'reject', reason);
  if (!decision.ok) return decision;
  return signalWorkflow({
    instanceId: decision.approval.instance_id,
    companyId,
    userId,
    event: 'REJECT',
    payload: { reason }
  });
}

async function rollbackWorkflow(instanceId, companyId, userId) {
  const db = require('../../db');
  const r = await db.query(
    `SELECT * FROM industrial_workflow_instances WHERE id = $1::uuid AND company_id = $2::uuid`,
    [instanceId, companyId]
  );
  const instance = r.rows[0];
  if (!instance) return { ok: false, reason: 'not_found' };

  const comp = await compensation.runCompensation(instance, 'rollback_context', {
    previous_context: instance.context,
    requested_by: userId
  });

  const sig = await signalWorkflow({ instanceId, companyId, userId, event: 'COMPENSATE' });
  if (sig.ok) {
    await signalWorkflow({ instanceId, companyId, userId, event: 'COMPENSATION_DONE' });
  }

  backbone.publishWorkflowEvent('governance.workflow.compensated', {
    companyId,
    correlationId: instance.correlation_id,
    payload: { instance_id: instanceId }
  });

  return { ok: comp.ok, compensation: comp, transition: sig };
}

function getHealth() {
  return {
    mode: flags.workflowEngineMode(),
    enabled: flags.isWorkflowEngineActive(),
    pilot_tenants: flags.pilotTenants(),
    definitions: bpmnRegistry.listDefinitions()
  };
}

module.exports = {
  startWorkflow,
  signalWorkflow,
  approveWorkflowStep,
  rejectWorkflowStep,
  rollbackWorkflow,
  getHealth
};
