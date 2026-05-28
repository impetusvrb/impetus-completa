'use strict';

const stateMachine = require('../stateMachine/stateMachineEngine');
const bpmnRegistry = require('../bpmn/bpmnDefinitionRegistry');
const audit = require('../audit/workflowAuditTracer');
const flags = require('../config/workflowEngineFlags');

function _log(event, data) {
  try {
    console.info('[WORKFLOW_RECOVERY]', JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
  } catch (_e) {}
}

/**
 * Recuperação segura — revalida estado persistido vs definição; não avança automaticamente mutações.
 */
async function recoverInstance(instanceId, companyId) {
  const db = require('../../db');
  const r = await db.query(
    `SELECT * FROM industrial_workflow_instances WHERE id = $1::uuid AND company_id = $2::uuid`,
    [instanceId, companyId]
  );
  const instance = r.rows[0];
  if (!instance) return { ok: false, reason: 'not_found' };

  const def = bpmnRegistry.getDefinition(instance.process_key, 1);
  if (!def) return { ok: false, reason: 'definition_missing' };

  const terminal = stateMachine.isTerminalState(def, instance.current_state);
  const safe = instance.status === 'running' && !terminal;

  await audit.recordAudit({
    instanceId,
    companyId,
    eventType: 'recovery_check',
    fromState: instance.current_state,
    toState: instance.current_state,
    payload: { safe_to_resume: safe, terminal, mode: flags.workflowEngineMode() }
  });

  _log('recovered', { instance_id: instanceId, state: instance.current_state, safe });
  return {
    ok: true,
    instance_id: instanceId,
    current_state: instance.current_state,
    safe_to_resume: safe,
    terminal,
    message: safe
      ? 'Instância consistente — aguardar sinal humano ou evento explícito.'
      : 'Instância terminal ou inconsistente — não retomar execução automática.'
  };
}

async function listStuckInstances(companyId, olderThanHours = 24) {
  const db = require('../../db');
  const r = await db.query(
    `SELECT id, process_key, current_state, correlation_id, updated_at
     FROM industrial_workflow_instances
     WHERE company_id = $1::uuid AND status = 'running'
       AND updated_at < now() - ($2::int * interval '1 hour')
     ORDER BY updated_at ASC LIMIT 100`,
    [companyId, olderThanHours]
  );
  return r.rows || [];
}

module.exports = { recoverInstance, listStuckInstances };
