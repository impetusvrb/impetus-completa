'use strict';

/**
 * AIOI-P1.1 — Outcome Tracking Service
 *
 * Responsabilidade: registrar outcomes de execuções concluídas (in_progress).
 *
 * Fluxo:
 *   industrial_operational_events (status='in_progress', ref de execução presente)
 *     ↓ buildOutcomePayload()
 *     ↓ persist em decision_payload.aioi_outcome + resolved_at
 *     ↓ status='resolved' (outcome_captured)
 *     ↓ learning_context preparado (NÃO enviado ao soberano)
 *
 * PROIBIÇÕES ABSOLUTAS (O2 / O3):
 *   ✗ operationalLearningService.learn/train/updateModel/recordOperationalOutcome
 *   ✗ operationalDecisionEngine / computePriorityScore / Truth / classification
 *   ✗ Worker, cron, PM2, API REST, dashboard
 *   ✗ Criar execução, decisão ou alterar approval
 *
 * Invocação: somente por chamada explícita (captureOutcome / capture*Outcome).
 */

const db = require('../../db');
const { isValidUUID } = require('../../utils/security');

const payloadBuilder = require('./aioiOutcomePayloadBuilder');
const metrics = require('./aioiOutcomeMetrics');

const LAYER = 'AIOI_OUTCOME_TRACKING';

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

async function _fetchIoeForOutcome(companyId, ioeId) {
  return _withTenantClient(companyId, async (client) => {
    const result = await client.query(
      `SELECT id, company_id, status, category, source_type, priority_band, priority_score,
              entity_type, entity_id, equipment_id, correlation_id,
              decision_type, decision_payload,
              approved_by_user_id, approved_at,
              execution_trace_id, workflow_instance_id,
              resolved_at, resolution_notes
       FROM industrial_operational_events
       WHERE id = $1::uuid AND company_id = $2::uuid`,
      [ioeId, companyId]
    );
    return result.rows[0] || null;
  });
}

function _hasExecutionReference(ioe) {
  return !!(ioe && (ioe.execution_trace_id || ioe.workflow_instance_id));
}

function _mergeOutcomeIntoDecisionPayload(existingPayload, outcome) {
  const base = _parseDecisionPayload(existingPayload);
  return {
    ...base,
    aioi_outcome:          outcome,
    aioi_outcome_captured: true
  };
}

function _parseDecisionPayload(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return { ...raw };
  try {
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

async function _persistOutcome({ companyId, ioeId, mergedPayload, outcomeSummary }) {
  return _withTenantClient(companyId, async (client) => {
    const result = await client.query(
      `UPDATE industrial_operational_events
       SET decision_payload = $3::jsonb,
           resolved_at      = now(),
           resolution_notes = COALESCE($4, resolution_notes),
           status           = 'resolved',
           updated_at       = now()
       WHERE id         = $2::uuid
         AND company_id = $1::uuid
         AND status     = 'in_progress'
         AND (execution_trace_id IS NOT NULL OR workflow_instance_id IS NOT NULL)
         AND (decision_payload->>'aioi_outcome_captured' IS NULL
              OR decision_payload->>'aioi_outcome_captured' = 'false')
         AND decision_payload->'aioi_outcome' IS NULL
       RETURNING id, correlation_id, decision_payload`,
      [
        companyId,
        ioeId,
        JSON.stringify(mergedPayload),
        outcomeSummary ? String(outcomeSummary).slice(0, 2000) : null
      ]
    );
    return result.rows[0] || null;
  });
}

// ---------------------------------------------------------------------------
// captureOutcome — núcleo de captura
// ---------------------------------------------------------------------------

/**
 * Captura outcome para um IOE em execução.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.ioeId
 * @param {string} params.outcomeStatus — success|partial_success|failure|cancelled
 * @param {string} [params.outcomeSummary]
 * @param {Array} [params.evidenceRefs]
 * @param {number} [params.executionDurationMs]
 * @returns {Promise<object>}
 */
async function captureOutcome({
  companyId,
  ioeId,
  outcomeStatus,
  outcomeSummary,
  evidenceRefs,
  executionDurationMs
}) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }
  if (!ioeId || !isValidUUID(String(ioeId))) {
    return { ok: false, error: 'ioeId inválido' };
  }

  const startMs = Date.now();

  try {
    const ioe = await _fetchIoeForOutcome(companyId, ioeId);

    if (!ioe) {
      metrics.recordError(companyId, ioeId, null, 'IOE não encontrado');
      return { ok: false, error: 'IOE não encontrado' };
    }

    // Idempotência O4
    if (payloadBuilder.hasCapturedOutcome(ioe)) {
      metrics.recordAlreadyCaptured(companyId, ioeId, ioe.correlation_id);
      return { ok: true, alreadyCaptured: true };
    }

    // Regra O1 — referência de execução obrigatória
    if (!_hasExecutionReference(ioe)) {
      metrics.recordError(companyId, ioeId, ioe.correlation_id, 'EXECUTION_REFERENCE_REQUIRED');
      return { ok: false, error: 'EXECUTION_REFERENCE_REQUIRED' };
    }

    if (ioe.status !== 'in_progress') {
      metrics.recordSkipped(companyId, ioeId, ioe.correlation_id, 'NOT_IN_PROGRESS');
      return { ok: false, error: 'NOT_IN_PROGRESS' };
    }

    const validation = payloadBuilder.validateOutcomePayload({
      outcomeStatus,
      outcomeSummary,
      evidenceRefs,
      executionDurationMs
    });
    if (!validation.ok) {
      metrics.recordError(companyId, ioeId, ioe.correlation_id, validation.error);
      return { ok: false, error: validation.error };
    }

    const outcome = payloadBuilder.buildOutcomePayload(ioe, {
      outcomeStatus,
      outcomeSummary,
      evidenceRefs,
      executionDurationMs
    });

    metrics.recordContextGenerated(companyId, ioeId, ioe.correlation_id);

    const mergedPayload = _mergeOutcomeIntoDecisionPayload(ioe.decision_payload, outcome);
    const persisted = await _persistOutcome({
      companyId,
      ioeId,
      mergedPayload,
      outcomeSummary
    });

    if (!persisted) {
      // Race condition ou idempotência concurrent
      metrics.recordAlreadyCaptured(companyId, ioeId, ioe.correlation_id);
      return { ok: true, alreadyCaptured: true };
    }

    const latencyMs = Date.now() - startMs;
    metrics.recordCaptured(companyId, ioeId, ioe.correlation_id, outcomeStatus, latencyMs);

    console.info(`[${LAYER}] Outcome capturado`, {
      company_id:     companyId,
      ioe_id:         ioeId,
      correlation_id: ioe.correlation_id,
      outcome_status: outcomeStatus,
      ref_type:       outcome.execution_reference.type,
      ref_id:         outcome.execution_reference.ref_id
    });

    return {
      ok:              true,
      captured:        true,
      outcome,
      learning_context: outcome.learning_context
    };

  } catch (err) {
    metrics.recordError(companyId, ioeId, null, err.message);
    console.error(`[${LAYER}] Erro na captura de outcome`, {
      company_id: companyId,
      ioe_id:     ioeId,
      error:      err.message
    });
    return { ok: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// captureExecutionOutcome — alias para action (execution_trace_id)
// ---------------------------------------------------------------------------

/**
 * Captura outcome de execução via actionRuntimeOrchestrator (execution_trace_id).
 *
 * @param {object} params
 * @returns {Promise<object>}
 */
async function captureExecutionOutcome(params) {
  const { companyId, ioeId } = params;

  const ioe = await _fetchIoeForOutcome(companyId, ioeId);
  if (!ioe) {
    return { ok: false, error: 'IOE não encontrado' };
  }
  if (!ioe.execution_trace_id) {
    metrics.recordError(companyId, ioeId, ioe.correlation_id, 'EXECUTION_REFERENCE_REQUIRED');
    return { ok: false, error: 'EXECUTION_REFERENCE_REQUIRED' };
  }

  return captureOutcome(params);
}

// ---------------------------------------------------------------------------
// captureWorkflowOutcome — alias para workflow (workflow_instance_id)
// ---------------------------------------------------------------------------

/**
 * Captura outcome de execução via workflowOrchestrator (workflow_instance_id).
 *
 * @param {object} params
 * @returns {Promise<object>}
 */
async function captureWorkflowOutcome(params) {
  const { companyId, ioeId } = params;

  const ioe = await _fetchIoeForOutcome(companyId, ioeId);
  if (!ioe) {
    return { ok: false, error: 'IOE não encontrado' };
  }
  if (!ioe.workflow_instance_id) {
    metrics.recordError(companyId, ioeId, ioe.correlation_id, 'EXECUTION_REFERENCE_REQUIRED');
    return { ok: false, error: 'EXECUTION_REFERENCE_REQUIRED' };
  }

  return captureOutcome(params);
}

// ---------------------------------------------------------------------------
// getCapturedOutcomes — consulta outcomes capturados
// ---------------------------------------------------------------------------

/**
 * Lista outcomes capturados para um tenant.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {number} [params.limit=50]
 * @returns {Promise<object>}
 */
async function getCapturedOutcomes({ companyId, limit = 50 }) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido', outcomes: [] };
  }

  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);

  try {
    const rows = await _withTenantClient(companyId, async (client) => {
      const result = await client.query(
        `SELECT id, company_id, correlation_id, decision_type,
                execution_trace_id, workflow_instance_id,
                decision_payload, resolved_at
         FROM industrial_operational_events
         WHERE company_id = $1::uuid
           AND decision_payload->>'aioi_outcome_captured' = 'true'
         ORDER BY resolved_at DESC NULLS LAST
         LIMIT $2`,
        [companyId, lim]
      );
      return result.rows || [];
    });

    const outcomes = rows.map((row) => {
      const payload = _parseDecisionPayload(row.decision_payload);
      return {
        ioe_id:         row.id,
        company_id:     row.company_id,
        correlation_id: row.correlation_id,
        decision_type:  row.decision_type,
        outcome:        payload.aioi_outcome || null,
        learning_context: payload.aioi_outcome?.learning_context || null,
        resolved_at:    row.resolved_at
      };
    });

    return { ok: true, outcomes, count: outcomes.length };

  } catch (err) {
    metrics.recordError(companyId, null, null, err.message);
    return { ok: false, error: err.message, outcomes: [] };
  }
}

module.exports = {
  captureOutcome,
  captureExecutionOutcome,
  captureWorkflowOutcome,
  getCapturedOutcomes
};
