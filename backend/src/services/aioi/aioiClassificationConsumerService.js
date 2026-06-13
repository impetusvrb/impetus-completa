'use strict';

/**
 * AIOI-ORG-5 — Classification Consumer Service (P0.8)
 *
 * Consome aioi_outbox (consumer_type='classification').
 * Classifica IOE via aioiClassificationEngine (determinístico).
 * Transição permitida: open → triaged APENAS.
 *
 * PROIBIÇÕES: LLM, runtime cognitivo, open→approved, open→executing.
 */

const db = require('../../db');
const outboxConsumer = require('./aioiOutboxConsumerService');
const classificationEngine = require('./aioiClassificationEngine');
const slaEngine = require('./aioiSlaEngineService');

const LAYER = 'AIOI_CLASSIFICATION_CONSUMER';
const CONSUMER_TYPE = 'classification';

/**
 * Aplica classificação a um IOE e persiste resultado.
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.ioeId
 * @returns {Promise<{ ok: boolean, updated?: boolean, error?: string }>}
 */
async function applyClassificationToIoe({ companyId, ioeId }) {
  const ioe = await outboxConsumer.fetchIoe(companyId, ioeId);
  if (!ioe) {
    return { ok: false, error: 'IOE não encontrado' };
  }

  if (ioe.status !== 'open') {
    return { ok: false, error: `IOE status=${ioe.status} — apenas open pode ser classificado` };
  }

  const result = classificationEngine.classifyIoe(ioe);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const cls = result.classification;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const updateResult = await client.query(
      `UPDATE industrial_operational_events
       SET status              = 'triaged',
           category            = $3,
           priority_band       = $4,
           classification_conf = $5::smallint,
           sla_class           = $6,
           due_at              = $7::timestamptz,
           aging_hours         = $8,
           breach_state        = $9,
           escalation_level    = $10::smallint,
           updated_at          = now()
       WHERE id         = $2::uuid
         AND company_id = $1::uuid
         AND status     = 'open'
       RETURNING id`,
      [
        companyId,
        ioeId,
        cls.category,
        cls.priority_band,
        cls.confidence,
        cls.sla_class,
        cls.due_at,
        cls.aging_hours,
        cls.breach_state,
        cls.escalation_level_int
      ]
    );

    await client.query('COMMIT');

    const updated = updateResult.rows.length > 0;
    if (updated) {
      console.info(`[${LAYER}] IOE classificado open→triaged`, {
        ioe_id: ioeId,
        company_id: companyId,
        category: cls.category,
        criticity: cls.criticity,
        confidence: cls.confidence,
        sla_class: cls.sla_class,
        breach_state: cls.breach_state
      });
    }

    return { ok: true, updated, classification: cls };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro ao aplicar classificação`, { ioe_id: ioeId, error: err.message });
    return { ok: false, error: err.message };
  } finally {
    client.release();
  }
}

/**
 * Processa uma entrada de outbox de classificação.
 * @param {object} params
 * @param {string} params.companyId
 * @param {object} params.outboxEntry
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function processClassificationEntry({ companyId, outboxEntry }) {
  const ioeId = outboxEntry.ioe_id || outboxEntry.payload?.ioe_id;
  if (!ioeId) {
    return { ok: false, error: 'outbox entry sem ioe_id' };
  }

  const classResult = await applyClassificationToIoe({ companyId, ioeId });
  if (!classResult.ok) {
    await outboxConsumer.markFailedOrRetry({
      companyId,
      outboxId: outboxEntry.id,
      currentAttempts: outboxEntry.attempts,
      errorMessage: classResult.error
    });
    return classResult;
  }

  await outboxConsumer.markDelivered({ companyId, outboxId: outboxEntry.id });
  return { ok: true, classification: classResult.classification };
}

/**
 * Processa lote de entradas de classificação do outbox.
 * @param {object} params
 * @param {string} params.companyId
 * @param {number} [params.batchSize=10]
 * @returns {Promise<{ ok: boolean, processed: number, failed: number }>}
 */
async function processClassificationBatch({ companyId, batchSize = 10 }) {
  const { rows } = await outboxConsumer.pickBatch({
    companyId,
    consumerType: CONSUMER_TYPE,
    batchSize
  });

  let processed = 0;
  let failed = 0;

  for (const entry of rows) {
    const result = await processClassificationEntry({ companyId, outboxEntry: entry });
    if (result.ok) processed++;
    else failed++;
  }

  return { ok: true, processed, failed, total: rows.length };
}

module.exports = {
  applyClassificationToIoe,
  processClassificationEntry,
  processClassificationBatch,
  CONSUMER_TYPE,
  LAYER
};
