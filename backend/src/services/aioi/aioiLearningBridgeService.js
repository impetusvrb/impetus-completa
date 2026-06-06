'use strict';

/**
 * AIOI-P1.2 — Learning Bridge Service
 *
 * Responsabilidade: delegar learning_context ao soberano operationalLearningService.
 *
 * Fluxo:
 *   industrial_operational_events (status='resolved', learning_context presente)
 *     ↓ buildLearningPayload(learning_context)
 *     ↓ operationalLearningService.recordOperationalOutcome()
 *     ↓ decision_payload.aioi_learning_submitted + aioi_learning_processed
 *
 * PROIBIÇÕES ABSOLUTAS (L2 / L3):
 *   ✗ Aprendizado local (learn/train/fit/updateModel/calculateLearning)
 *   ✗ operationalDecisionEngine / computePriorityScore / Truth / classification
 *   ✗ workflowOrchestrator / actionRuntimeOrchestrator
 *   ✗ Worker, cron, PM2, API REST, dashboard
 *
 * Invocação: somente por chamada explícita (submitLearning / processBatch).
 */

const db = require('../../db');
const { isValidUUID } = require('../../utils/security');

// Soberano de aprendizado — DELEGAÇÃO (AIOI_INTEGRATION_CATALOG.md)
const operationalLearningService = require('../operationalLearningService');

const payloadBuilder = require('./aioiLearningPayloadBuilder');
const metrics = require('./aioiLearningMetrics');

const LAYER = 'AIOI_LEARNING_BRIDGE';
const DEFAULT_BATCH_SIZE = 10;

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

async function _fetchResolvedIoe(companyId, ioeId) {
  return _withTenantClient(companyId, async (client) => {
    const result = await client.query(
      `SELECT id, company_id, status, correlation_id, decision_type, decision_payload
       FROM industrial_operational_events
       WHERE id = $1::uuid AND company_id = $2::uuid`,
      [ioeId, companyId]
    );
    return result.rows[0] || null;
  });
}

async function _fetchResolvedIoesForLearning(companyId, limit) {
  return _withTenantClient(companyId, async (client) => {
    const result = await client.query(
      `SELECT id, company_id, status, correlation_id, decision_type, decision_payload
       FROM industrial_operational_events
       WHERE company_id = $1::uuid
         AND status = 'resolved'
         AND decision_payload->'aioi_outcome'->'learning_context' IS NOT NULL
         AND (decision_payload->>'aioi_learning_submitted' IS NULL
              OR decision_payload->>'aioi_learning_submitted' = 'false')
       ORDER BY resolved_at ASC NULLS LAST
       LIMIT $2`,
      [companyId, limit]
    );
    return result.rows || [];
  });
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

async function _persistLearningSubmitted({ companyId, ioeId, mergedPayload }) {
  return _withTenantClient(companyId, async (client) => {
    const result = await client.query(
      `UPDATE industrial_operational_events
       SET decision_payload = $3::jsonb,
           updated_at       = now()
       WHERE id         = $2::uuid
         AND company_id = $1::uuid
         AND status     = 'resolved'
         AND decision_payload->'aioi_outcome'->'learning_context' IS NOT NULL
         AND (decision_payload->>'aioi_learning_submitted' IS NULL
              OR decision_payload->>'aioi_learning_submitted' = 'false')
       RETURNING id, correlation_id`,
      [companyId, ioeId, JSON.stringify(mergedPayload)]
    );
    return result.rows[0] || null;
  });
}

function _mergeLearningFlags(existingPayload) {
  const base = _parseDecisionPayload(existingPayload);
  const now = new Date().toISOString();
  return {
    ...base,
    aioi_learning_submitted:   true,
    aioi_learning_processed:   true,
    aioi_learning_submitted_at: now,
    aioi_learning_processed_at: now
  };
}

// ---------------------------------------------------------------------------
// Delegação ao soberano
// ---------------------------------------------------------------------------

function _delegateToLearningService(learningPayload) {
  operationalLearningService.recordOperationalOutcome(learningPayload);
}

// ---------------------------------------------------------------------------
// processResolvedIoe — núcleo de delegação
// ---------------------------------------------------------------------------

/**
 * Processa submissão de aprendizado para um IOE resolvido.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.ioeId
 * @returns {Promise<object>}
 */
async function processResolvedIoe({ companyId, ioeId }) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, reason: 'companyId inválido' };
  }
  if (!ioeId || !isValidUUID(String(ioeId))) {
    return { ok: false, reason: 'ioeId inválido' };
  }

  const startMs = Date.now();

  try {
    const ioe = await _fetchResolvedIoe(companyId, ioeId);

    if (!ioe) {
      metrics.recordError(companyId, ioeId, null, 'IOE não encontrado');
      return { ok: false, reason: 'IOE não encontrado' };
    }

    // L1 — elegibilidade
    if (ioe.status !== 'resolved') {
      metrics.recordSkipped(companyId, ioeId, ioe.correlation_id, 'STATUS_NOT_RESOLVED');
      return { ok: false, reason: 'STATUS_NOT_RESOLVED' };
    }

    const learningContext = payloadBuilder.extractLearningContext(ioe);
    if (!learningContext) {
      metrics.recordError(companyId, ioeId, ioe.correlation_id, 'LEARNING_CONTEXT_REQUIRED');
      return { ok: false, reason: 'LEARNING_CONTEXT_REQUIRED' };
    }

    // L4 — idempotência
    if (payloadBuilder.hasLearningSubmitted(ioe)) {
      metrics.recordAlreadySubmitted(companyId, ioeId, ioe.correlation_id);
      return { ok: true, alreadySubmitted: true };
    }

    const validation = payloadBuilder.validateLearningPayload(learningContext);
    if (!validation.ok) {
      metrics.recordError(companyId, ioeId, ioe.correlation_id, validation.reason);
      return { ok: false, reason: validation.reason };
    }

    // L2 — delegação ao soberano (sem aprendizado local)
    const learningPayload = payloadBuilder.buildLearningPayload(learningContext);

    // L6 — transação: soberano primeiro, persistência só após sucesso
    try {
      _delegateToLearningService(learningPayload);
    } catch (delegateErr) {
      metrics.recordError(companyId, ioeId, ioe.correlation_id, delegateErr.message);
      return { ok: false, reason: delegateErr.message };
    }

    const mergedPayload = _mergeLearningFlags(ioe.decision_payload);
    const persisted = await _persistLearningSubmitted({
      companyId,
      ioeId,
      mergedPayload
    });

    if (!persisted) {
      metrics.recordAlreadySubmitted(companyId, ioeId, ioe.correlation_id);
      return { ok: true, alreadySubmitted: true };
    }

    const latencyMs = Date.now() - startMs;
    metrics.recordSubmitted(companyId, ioeId, ioe.correlation_id, latencyMs);
    metrics.recordProcessed(companyId, ioeId, ioe.correlation_id);

    console.info(`[${LAYER}] Aprendizado delegado ao soberano`, {
      company_id:     companyId,
      ioe_id:         ioeId,
      correlation_id: ioe.correlation_id,
      machine_id:     learningContext.machine_id,
      outcome_status: learningContext.outcome_status
    });

    return {
      ok:        true,
      submitted: true,
      processed: true
    };

  } catch (err) {
    metrics.recordError(companyId, ioeId, null, err.message);
    console.error(`[${LAYER}] Erro na delegação de aprendizado`, {
      company_id: companyId,
      ioe_id:     ioeId,
      error:      err.message
    });
    return { ok: false, reason: err.message };
  }
}

// ---------------------------------------------------------------------------
// submitLearning — entrada pública
// ---------------------------------------------------------------------------

/**
 * Submete learning_context de um IOE resolvido ao operationalLearningService.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.ioeId
 * @returns {Promise<object>}
 */
async function submitLearning({ companyId, ioeId }) {
  return processResolvedIoe({ companyId, ioeId });
}

// ---------------------------------------------------------------------------
// processBatch — lote de IOEs resolvidos
// ---------------------------------------------------------------------------

/**
 * Processa lote de IOEs resolvidos elegíveis para submissão de aprendizado.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {number} [params.batchSize=10]
 * @returns {Promise<object>}
 */
async function processBatch({ companyId, batchSize = DEFAULT_BATCH_SIZE }) {
  if (!companyId) {
    return { processed: 0, submitted: 0, skipped: 0, failed: 0, errors: ['companyId ausente'] };
  }

  const lim = Math.min(Math.max(parseInt(String(batchSize), 10) || DEFAULT_BATCH_SIZE, 1), 100);
  const ioes = await _fetchResolvedIoesForLearning(companyId, lim);

  let submitted = 0;
  let skipped   = 0;
  let failed    = 0;
  const errors  = [];

  for (const ioe of ioes) {
    const result = await processResolvedIoe({ companyId, ioeId: ioe.id });
    if (result.ok && result.submitted) {
      submitted++;
    } else if (result.ok && result.alreadySubmitted) {
      skipped++;
    } else if (!result.ok) {
      failed++;
      if (result.reason) errors.push(result.reason);
    }
  }

  return {
    processed: ioes.length,
    submitted,
    skipped,
    failed,
    errors
  };
}

module.exports = {
  submitLearning,
  processResolvedIoe,
  processBatch
};
