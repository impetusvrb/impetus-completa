'use strict';

/**
 * AIOI-P0.4 — Decision Bridge Service
 *
 * Responsabilidade: analisar IOEs triaged, consultar operationalDecisionEngine
 * (soberano) e persistir sugestões em decision_type / decision_payload.
 *
 * Fluxo:
 *   industrial_operational_events (status='triaged', sem decisão)
 *     ↓ buildOperationalPlanFromIoe (contexto)
 *     ↓ operationalDecisionEngine.evaluateOperationalDecisions() (soberano)
 *     ↓ buildDecisionPayload + resolveDecisionType
 *     ↓ persistDecisionSuggestion (decision_type + decision_payload)
 *
 * PROIBIÇÕES ABSOLUTAS:
 *   ✗ actionRuntimeOrchestrator.execute()
 *   ✗ workflowOrchestrator.start/execute/run()
 *   ✗ scheduleOperationalDecisionSignals() (side-effects: alerts DB, learning)
 *   ✗ Preencher approved_by_user_id ou approved_at (HITL obrigatório)
 *   ✗ Worker permanente, cron, PM2, scheduler, listener automático
 *   ✗ Motor de decisão paralelo — ODE é a única fonte de avaliação
 *
 * Invocação: somente por chamada explícita (processDecisionForIoe / processBatch).
 */

const db = require('../../db');
const { isValidUUID } = require('../../utils/security');

// Soberano de decisão — REUSE (AIOI_INTEGRATION_CATALOG.md §2.3 WRAP)
const operationalDecisionEngine = require('../operationalDecisionEngine');

const payloadBuilder = require('./aioiDecisionPayloadBuilder');
const metrics = require('./aioiDecisionMetrics');

const LAYER = 'AIOI_DECISION_BRIDGE';
const DEFAULT_BATCH_SIZE = 10;

// ---------------------------------------------------------------------------
// Leitura de IOEs elegíveis
// ---------------------------------------------------------------------------

/**
 * Busca um IOE triaged pelo ID.
 *
 * @param {string} companyId
 * @param {string} ioeId
 * @returns {Promise<object|null>}
 */
async function fetchTriagedIoe(companyId, ioeId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const result = await client.query(
      `SELECT id, company_id, status, category, source_type, priority_band, priority_score,
              truth_state, entity_type, entity_id, equipment_id, classification_conf,
              correlation_id, evidence_refs, decision_type, decision_payload,
              approved_by_user_id, approved_at
       FROM industrial_operational_events
       WHERE id         = $1::uuid
         AND company_id = $2::uuid
         AND status     = 'triaged'`,
      [ioeId, companyId]
    );

    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro ao buscar IOE triaged`, { ioe_id: ioeId, error: err.message });
    return null;
  } finally {
    client.release();
  }
}

/**
 * Busca IOEs triaged sem decisão para processamento em lote.
 *
 * @param {string} companyId
 * @param {number} [limit=10]
 * @returns {Promise<object[]>}
 */
async function fetchTriagedIoesWithoutDecision(companyId, limit = DEFAULT_BATCH_SIZE) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const result = await client.query(
      `SELECT id, company_id, status, category, source_type, priority_band, priority_score,
              truth_state, entity_type, entity_id, equipment_id, classification_conf,
              correlation_id, evidence_refs, decision_type, decision_payload,
              approved_by_user_id, approved_at
       FROM industrial_operational_events
       WHERE company_id      = $1::uuid
         AND status          = 'triaged'
         AND decision_type   IS NULL
         AND decision_payload IS NULL
       ORDER BY created_at ASC
       LIMIT $2`,
      [companyId, Math.min(Math.max(parseInt(String(limit), 10) || DEFAULT_BATCH_SIZE, 1), 100)]
    );

    await client.query('COMMIT');
    return result.rows || [];
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro ao buscar IOEs sem decisão`, { company_id: companyId, error: err.message });
    return [];
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Persistência de sugestão (somente decision_type + decision_payload)
// ---------------------------------------------------------------------------

/**
 * Persiste sugestão de decisão no IOE.
 * HITL: approved_by_user_id e approved_at permanecem NULL.
 * Idempotência: só atualiza se decision_type e decision_payload forem NULL.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.ioeId
 * @param {string} params.decisionType
 * @param {object} params.decisionPayload
 * @returns {Promise<{ ok: boolean, updated: boolean, error?: string }>}
 */
async function persistDecisionSuggestion({ companyId, ioeId, decisionType, decisionPayload }) {
  if (!payloadBuilder.isValidDecisionPayload(decisionPayload)) {
    return { ok: false, updated: false, error: 'decision_payload inválido' };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const result = await client.query(
      `UPDATE industrial_operational_events
       SET decision_type    = $3,
           decision_payload = $4::jsonb,
           updated_at       = now()
       WHERE id              = $2::uuid
         AND company_id      = $1::uuid
         AND status          = 'triaged'
         AND decision_type   IS NULL
         AND decision_payload IS NULL
       RETURNING id, approved_by_user_id, approved_at`,
      [companyId, ioeId, decisionType, JSON.stringify(decisionPayload)]
    );

    await client.query('COMMIT');

    const updated = result.rows.length > 0;
    return { ok: true, updated };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro ao persistir sugestão`, {
      ioe_id: ioeId,
      company_id: companyId,
      error: err.message
    });
    return { ok: false, updated: false, error: err.message };
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Processamento de um IOE (chamada explícita)
// ---------------------------------------------------------------------------

/**
 * Gera sugestão de decisão para um IOE triaged específico.
 * Chamada explícita — nenhum listener automático.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.ioeId
 * @returns {Promise<{
 *   ok: boolean,
 *   skipped?: boolean,
 *   decision_type?: string,
 *   error?: string
 * }>}
 */
async function processDecisionForIoe({ companyId, ioeId }) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }
  if (!ioeId || !isValidUUID(String(ioeId))) {
    return { ok: false, error: 'ioeId inválido' };
  }

  const ioe = await fetchTriagedIoe(companyId, ioeId);

  if (!ioe) {
    metrics.recordError(companyId, ioeId, null, 'ioe_not_found_or_not_triaged');
    return { ok: false, error: 'IOE não encontrado ou status != triaged' };
  }

  const correlationId = ioe.correlation_id || null;
  metrics.recordRequested(companyId, ioeId, correlationId);

  // Idempotência: ignorar se decisão já existe
  if (payloadBuilder.hasExistingDecision(ioe)) {
    metrics.recordSkipped(companyId, ioeId, correlationId, 'decision_already_exists');
    return { ok: true, skipped: true, reason: 'decision_already_exists' };
  }

  try {
    // -----------------------------------------------------------------------
    // 1. Construir contexto e plano a partir do IOE (WRAP — sem decisão local)
    // -----------------------------------------------------------------------
    const plan    = payloadBuilder.buildOperationalPlanFromIoe(ioe);
    const context = payloadBuilder.buildOdeContext(ioe, companyId);

    // -----------------------------------------------------------------------
    // 2. Consultar soberano — operationalDecisionEngine (Contrato R-D1)
    // PROIBIDO: scheduleOperationalDecisionSignals (side-effects)
    // -----------------------------------------------------------------------
    const evaluation = operationalDecisionEngine.evaluateOperationalDecisions(plan, context);

    // -----------------------------------------------------------------------
    // 3. Mapear saída do ODE → decision_type + decision_payload
    // -----------------------------------------------------------------------
    const decisionType    = payloadBuilder.resolveDecisionType(evaluation);
    const decisionPayload = payloadBuilder.buildDecisionPayload(evaluation, ioe);

    metrics.recordReceived(companyId, ioeId, correlationId, decisionType);

    // -----------------------------------------------------------------------
    // 4. Persistir sugestão (HITL: approved_by_user_id/approved_at permanecem NULL)
    // -----------------------------------------------------------------------
    const persistResult = await persistDecisionSuggestion({
      companyId,
      ioeId,
      decisionType,
      decisionPayload
    });

    if (!persistResult.ok) {
      metrics.recordError(companyId, ioeId, correlationId, persistResult.error);
      return { ok: false, error: persistResult.error };
    }

    if (!persistResult.updated) {
      metrics.recordSkipped(companyId, ioeId, correlationId, 'concurrent_decision_write');
      return { ok: true, skipped: true, reason: 'concurrent_decision_write' };
    }

    metrics.recordPersisted(companyId, ioeId, correlationId, decisionType);

    console.info(`[${LAYER}] Sugestão de decisão persistida`, {
      company_id:     companyId,
      ioe_id:         ioeId,
      correlation_id: correlationId,
      decision_type:  decisionType
      // decision_payload NÃO é logado (observabilidade P0.4)
    });

    return { ok: true, decision_type: decisionType };

  } catch (err) {
    metrics.recordError(companyId, ioeId, correlationId, err.message);
    console.error(`[${LAYER}] Erro no bridge de decisão`, {
      company_id: companyId,
      ioe_id:     ioeId,
      error:      err.message
    });
    return { ok: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Processamento em lote (chamada explícita)
// ---------------------------------------------------------------------------

/**
 * Processa um lote de IOEs triaged sem decisão.
 * Chamada explícita — sem worker permanente.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {number} [params.batchSize=10]
 * @returns {Promise<{
 *   processed: number,
 *   generated: number,
 *   skipped: number,
 *   failed: number,
 *   errors: string[]
 * }>}
 */
async function processBatch({ companyId, batchSize = DEFAULT_BATCH_SIZE }) {
  if (!companyId) {
    return { processed: 0, generated: 0, skipped: 0, failed: 0, errors: ['companyId ausente'] };
  }

  const ioes = await fetchTriagedIoesWithoutDecision(companyId, batchSize);

  if (!ioes.length) {
    return { processed: 0, generated: 0, skipped: 0, failed: 0, errors: [] };
  }

  let generated = 0;
  let skipped   = 0;
  let failed    = 0;
  const errors  = [];

  for (const ioe of ioes) {
    const result = await processDecisionForIoe({ companyId, ioeId: ioe.id });
    if (result.ok && result.skipped) {
      skipped++;
    } else if (result.ok) {
      generated++;
    } else {
      failed++;
      if (result.error) errors.push(result.error);
    }
  }

  return {
    processed: ioes.length,
    generated,
    skipped,
    failed,
    errors
  };
}

module.exports = {
  processDecisionForIoe,
  processBatch,
  fetchTriagedIoe,
  fetchTriagedIoesWithoutDecision,
  persistDecisionSuggestion
};
