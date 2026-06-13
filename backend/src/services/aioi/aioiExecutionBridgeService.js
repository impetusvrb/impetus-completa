'use strict';

/**
 * AIOI-P1.0 — Execution Bridge Service
 *
 * Responsabilidade: delegar IOEs aprovados (HITL) aos soberanos de execução.
 *
 * Fluxo:
 *   industrial_operational_events (status='approved', HITL confirmado)
 *     ↓ resolveExecutionTarget(decision_type)
 *     ↓ workflow → workflowOrchestrator.startWorkflow()
 *     ↓ direct_action → actionRuntimeOrchestrator.executeToolCall()
 *     ↓ suggest_only / escalate → skipped (sem alteração de status)
 *     ↓ persist workflow_instance_id ou execution_trace_id
 *     ↓ status='in_progress'
 *
 * PROIBIÇÕES ABSOLUTAS (AIOI_SOVEREIGNTY_MAP.md / E2 / E3):
 *   ✗ Execução local (execute/run/start implementados no AIOI)
 *   ✗ operationalDecisionEngine / computePriorityScore / Truth / Learning
 *   ✗ Worker, cron, PM2, API REST, dashboard
 *   ✗ Execução sem HITL (approved_by_user_id + approved_at obrigatórios)
 *
 * Invocação: somente por chamada explícita (requestExecution / processBatch).
 */

const db = require('../../db');
const { isValidUUID } = require('../../utils/security');

// Soberanos de execução — DELEGAÇÃO (AIOI_INTEGRATION_CATALOG.md)
const workflowOrchestrator = require('../../workflowEngine/orchestration/workflowOrchestrator');
const actionRuntimeOrchestrator = require('../../actionRuntime/orchestration/actionRuntimeOrchestrator');

const payloadBuilder = require('./aioiExecutionPayloadBuilder');
const metrics = require('./aioiExecutionMetrics');

const LAYER = 'AIOI_EXECUTION_BRIDGE';
const DEFAULT_BATCH_SIZE = 10;

/** PC-EXE-04 — status proibidos para execução */
const BLOCKED_EXECUTION_STATUSES = Object.freeze(['open', 'triaged', 'pending_approval']);

// ---------------------------------------------------------------------------
// Helpers RLS
// ---------------------------------------------------------------------------

async function _withTenantClient(companyId, fn) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function _fetchApprovedIoe(companyId, ioeId) {
  return _withTenantClient(companyId, async (client) => {
    const result = await client.query(
      `SELECT id, company_id, status, category, source_type, priority_band, priority_score,
              entity_type, entity_id, equipment_id, correlation_id, external_ref_id,
              truth_state, evidence_refs,
              decision_type, decision_payload,
              approved_by_user_id, approved_at,
              execution_trace_id, workflow_instance_id
       FROM industrial_operational_events
       WHERE id = $1::uuid AND company_id = $2::uuid`,
      [ioeId, companyId]
    );
    return result.rows[0] || null;
  });
}

async function _fetchApprovedIoesForExecution(companyId, limit) {
  return _withTenantClient(companyId, async (client) => {
    const result = await client.query(
      `SELECT id, company_id, status, category, source_type, priority_band, priority_score,
              entity_type, entity_id, equipment_id, correlation_id, external_ref_id,
              truth_state, evidence_refs,
              decision_type, decision_payload,
              approved_by_user_id, approved_at,
              execution_trace_id, workflow_instance_id
       FROM industrial_operational_events
       WHERE company_id = $1::uuid
         AND status = 'approved'
         AND approved_by_user_id IS NOT NULL
         AND approved_at IS NOT NULL
         AND decision_type IS NOT NULL
         AND decision_payload IS NOT NULL
         AND execution_trace_id IS NULL
         AND workflow_instance_id IS NULL
       ORDER BY approved_at ASC
       LIMIT $2`,
      [companyId, limit]
    );
    return result.rows || [];
  });
}

/**
 * Valida pré-requisitos HITL e decisão (regra E1).
 *
 * @param {object} ioe
 * @returns {{ ok: boolean, error?: string }}
 */
function _validateHitlAndDecision(ioe) {
  if (!ioe) {
    return { ok: false, error: 'IOE não encontrado' };
  }
  if (BLOCKED_EXECUTION_STATUSES.includes(ioe.status)) {
    return { ok: false, error: 'EXECUTION_BLOCKED_STATUS' };
  }
  if (ioe.status !== 'approved') {
    return { ok: false, error: 'HITL_REQUIRED' };
  }
  if (!ioe.approved_by_user_id) {
    return { ok: false, error: 'HITL_REQUIRED' };
  }
  if (!ioe.approved_at) {
    return { ok: false, error: 'HITL_REQUIRED' };
  }
  if (!ioe.decision_type || !ioe.decision_payload) {
    return { ok: false, error: 'DECISION_REQUIRED' };
  }
  return { ok: true };
}

/** PC-EXE-01..06 — validação exportada para auditoria P1 */
function validateExecutionEligibility(ioe) {
  return _validateHitlAndDecision(ioe);
}

/**
 * Verifica idempotência de delegação (regra E4).
 */
function _isAlreadyDelegated(ioe) {
  return !!(ioe.execution_trace_id || ioe.workflow_instance_id);
}

// ---------------------------------------------------------------------------
// Persistência pós-delegação
// ---------------------------------------------------------------------------

async function _persistWorkflowDelegation({ companyId, ioeId, workflowInstanceId }) {
  return _withTenantClient(companyId, async (client) => {
    const result = await client.query(
      `UPDATE industrial_operational_events
       SET workflow_instance_id = $3::uuid,
           status              = 'in_progress',
           updated_at          = now()
       WHERE id         = $2::uuid
         AND company_id = $1::uuid
         AND status     = 'approved'
         AND workflow_instance_id IS NULL
         AND execution_trace_id   IS NULL
       RETURNING id`,
      [companyId, ioeId, workflowInstanceId]
    );
    return result.rows.length > 0;
  });
}

async function _persistActionDelegation({ companyId, ioeId, executionTraceId }) {
  return _withTenantClient(companyId, async (client) => {
    const result = await client.query(
      `UPDATE industrial_operational_events
       SET execution_trace_id = $3::uuid,
           status             = 'in_progress',
           updated_at         = now()
       WHERE id         = $2::uuid
         AND company_id = $1::uuid
         AND status     = 'approved'
         AND workflow_instance_id IS NULL
         AND execution_trace_id   IS NULL
       RETURNING id`,
      [companyId, ioeId, executionTraceId]
    );
    return result.rows.length > 0;
  });
}

// ---------------------------------------------------------------------------
// Delegação aos soberanos
// ---------------------------------------------------------------------------

async function _delegateToWorkflow(ioe) {
  const wfPayload = payloadBuilder.buildWorkflowPayload(ioe);
  const result = await workflowOrchestrator.startWorkflow(wfPayload);

  if (!result || !result.ok) {
    throw new Error(result?.reason || 'workflow_delegation_failed');
  }

  const instanceId = result.instance_id;
  if (!instanceId || !isValidUUID(String(instanceId))) {
    throw new Error('workflow_instance_id_invalid');
  }

  return { target: 'workflow', refId: instanceId };
}

async function _delegateToAction(ioe) {
  const { toolName, args, ctx } = payloadBuilder.buildActionPayload(ioe);
  const result = await actionRuntimeOrchestrator.executeToolCall(toolName, args, ctx);

  if (!result || result.ok === false) {
    throw new Error(result?.message || result?.reason || 'action_delegation_failed');
  }

  const traceId = result.trace_id;
  if (!traceId || !isValidUUID(String(traceId))) {
    throw new Error('execution_trace_id_invalid');
  }

  return { target: 'action', refId: traceId };
}

// ---------------------------------------------------------------------------
// processApprovedIoe — núcleo de delegação
// ---------------------------------------------------------------------------

/**
 * Processa delegação de execução para um IOE aprovado.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.ioeId
 * @returns {Promise<object>}
 */
async function processApprovedIoe({ companyId, ioeId }) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }
  if (!ioeId || !isValidUUID(String(ioeId))) {
    return { ok: false, error: 'ioeId inválido' };
  }

  const startMs = Date.now();

  try {
    const ioe = await _fetchApprovedIoe(companyId, ioeId);
    const validation = _validateHitlAndDecision(ioe);

    if (!validation.ok) {
      metrics.recordError(companyId, ioeId, ioe?.correlation_id, validation.error);
      return { ok: false, error: validation.error };
    }

    metrics.recordRequested(companyId, ioeId, ioe.correlation_id, ioe.decision_type);

    // Idempotência E4
    if (_isAlreadyDelegated(ioe)) {
      metrics.recordAlreadyDelegated(companyId, ioeId, ioe.correlation_id);
      return { ok: true, alreadyDelegated: true };
    }

    const { executable, target } = payloadBuilder.resolveExecutionTarget(ioe.decision_type);

    if (!executable) {
      metrics.recordSkipped(companyId, ioeId, ioe.correlation_id, 'NON_EXECUTABLE_DECISION');
      return { ok: true, skipped: true, reason: 'NON_EXECUTABLE_DECISION' };
    }

    // Delegar ao soberano (E2 — sem execução local)
    let delegation;
    if (target === 'workflow') {
      delegation = await _delegateToWorkflow(ioe);
      const updated = await _persistWorkflowDelegation({
        companyId,
        ioeId,
        workflowInstanceId: delegation.refId
      });
      if (!updated) {
        metrics.recordAlreadyDelegated(companyId, ioeId, ioe.correlation_id);
        return { ok: true, alreadyDelegated: true };
      }
    } else if (target === 'action') {
      delegation = await _delegateToAction(ioe);
      const updated = await _persistActionDelegation({
        companyId,
        ioeId,
        executionTraceId: delegation.refId
      });
      if (!updated) {
        metrics.recordAlreadyDelegated(companyId, ioeId, ioe.correlation_id);
        return { ok: true, alreadyDelegated: true };
      }
    } else {
      metrics.recordSkipped(companyId, ioeId, ioe.correlation_id, 'UNKNOWN_TARGET');
      return { ok: true, skipped: true, reason: 'UNKNOWN_TARGET' };
    }

    const latencyMs = Date.now() - startMs;
    metrics.recordDelegated(
      companyId,
      ioeId,
      ioe.correlation_id,
      delegation.target,
      delegation.refId,
      latencyMs
    );

    console.info(`[${LAYER}] Execução delegada ao soberano`, {
      company_id:     companyId,
      ioe_id:         ioeId,
      correlation_id: ioe.correlation_id,
      target:         delegation.target,
      ref_id:         delegation.refId,
      decision_type:  ioe.decision_type
    });

    return {
      ok:        true,
      delegated: true,
      target:    delegation.target,
      ref_id:    delegation.refId
    };

  } catch (err) {
    metrics.recordError(companyId, ioeId, null, err.message);
    console.error(`[${LAYER}] Erro na delegação`, {
      company_id: companyId,
      ioe_id:     ioeId,
      error:      err.message
    });
    return { ok: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// requestExecution — alias público (validação + delegação)
// ---------------------------------------------------------------------------

/**
 * Solicita execução para um IOE aprovado (entrada pública).
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.ioeId
 * @returns {Promise<object>}
 */
async function requestExecution({ companyId, ioeId }) {
  return processApprovedIoe({ companyId, ioeId });
}

// ---------------------------------------------------------------------------
// processBatch — lote de IOEs aprovados
// ---------------------------------------------------------------------------

/**
 * Processa lote de IOEs aprovados elegíveis para delegação.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {number} [params.batchSize=10]
 * @returns {Promise<object>}
 */
async function processBatch({ companyId, batchSize = DEFAULT_BATCH_SIZE }) {
  if (!companyId) {
    return { processed: 0, delegated: 0, skipped: 0, failed: 0, errors: ['companyId ausente'] };
  }

  const lim = Math.min(Math.max(parseInt(String(batchSize), 10) || DEFAULT_BATCH_SIZE, 1), 100);
  const ioes = await _fetchApprovedIoesForExecution(companyId, lim);

  let delegated = 0;
  let skipped   = 0;
  let failed    = 0;
  const errors  = [];

  for (const ioe of ioes) {
    const result = await processApprovedIoe({ companyId, ioeId: ioe.id });
    if (result.ok && result.delegated) {
      delegated++;
    } else if (result.ok && (result.skipped || result.alreadyDelegated)) {
      skipped++;
    } else if (!result.ok) {
      failed++;
      if (result.error) errors.push(result.error);
    }
  }

  return {
    processed: ioes.length,
    delegated,
    skipped,
    failed,
    errors
  };
}

module.exports = {
  requestExecution,
  processApprovedIoe,
  processBatch,
  validateExecutionEligibility,
  BLOCKED_EXECUTION_STATUSES
};
