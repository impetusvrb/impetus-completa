'use strict';

/**
 * AIOI-P0.3 — Serviço base de consumo do aioi_outbox
 *
 * Responsabilidade: fornecer primitivas transacionais para:
 *   1. Leitura de lotes do aioi_outbox (FOR UPDATE SKIP LOCKED)
 *   2. Transição pending → processing
 *   3. Transição processing → delivered (sucesso)
 *   4. Transição processing → pending (retry com backoff)
 *   5. Transição processing → failed (max attempts atingido)
 *
 * REGRAS ARQUITETURAIS:
 *   ✓ FOR UPDATE SKIP LOCKED obrigatório (evita double-pick)
 *   ✓ RLS ativo: set_config(app.current_company_id) antes de todo acesso
 *   ✓ Cada operação em transação atômica
 *   ✓ Sem criação de workers, PM2, cron, schedulers
 *   ✓ Sem lógica de negócio — apenas movimentação de estado de fila
 *   ✓ aioi_outbox é a única fila (AIOI_BUS_ARCHITECTURE.md §1)
 *
 * Backoff obrigatório:
 *   1ª falha → +1 min | 2ª falha → +5 min | 3ª falha → +15 min
 *   attempts > 3 → status = failed
 */

const db = require('../../db');

const LAYER = 'AIOI_OUTBOX_CONSUMER';

// Backoff em minutos por número de tentativas
const BACKOFF_MINUTES = [1, 5, 15];
const MAX_ATTEMPTS = 3;
const DEFAULT_BATCH_SIZE = 10;

// ---------------------------------------------------------------------------
// Utilitário de backoff
// ---------------------------------------------------------------------------

/**
 * Calcula o `next_attempt_at` baseado no número de tentativas atuais.
 * @param {number} attempts — número de tentativas já efetuadas (ANTES desta falha)
 * @returns {string} ISO timestamp
 */
function _nextAttemptAt(attempts) {
  const idx = Math.min(attempts, BACKOFF_MINUTES.length - 1);
  const minutes = BACKOFF_MINUTES[idx];
  const next = new Date(Date.now() + minutes * 60 * 1000);
  return next.toISOString();
}

// ---------------------------------------------------------------------------
// 1. Leitura de lote (pending → processing) com FOR UPDATE SKIP LOCKED
// ---------------------------------------------------------------------------

/**
 * Seleciona e bloqueia um lote de entradas do aioi_outbox para processamento.
 * Garante que cada entrada seja processada por exatamente um consumer (SKIP LOCKED).
 *
 * @param {object} params
 * @param {string}  params.companyId
 * @param {string}  [params.consumerType='classification']
 * @param {number}  [params.batchSize=10]
 * @param {object}  [params.client] — cliente pg pré-conectado (para uso em transação externa)
 * @returns {Promise<{ rows: Array<object>, client: object }>}
 *   Retorna as linhas selecionadas e o client pg (que o caller DEVE commitar ou rollback).
 *   O caller é responsável por liberar o client após COMMIT/ROLLBACK.
 */
async function pickBatch({ companyId, consumerType = 'classification', batchSize = DEFAULT_BATCH_SIZE, client: externalClient }) {
  const client = externalClient || await db.pool.connect();
  const ownClient = !externalClient;

  try {
    if (ownClient) {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
      await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);
    }

    // Marcar como 'processing' e retornar linhas — tudo em uma operação atômica
    const result = await client.query(
      `UPDATE aioi_outbox
       SET status = 'processing',
           updated_at = now()
       WHERE id IN (
         SELECT id
         FROM aioi_outbox
         WHERE status = 'pending'
           AND consumer_type = $1
           AND company_id = $2::uuid
           AND next_attempt_at <= now()
         ORDER BY created_at ASC
         LIMIT $3
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
      [consumerType, companyId, Math.min(Math.max(parseInt(String(batchSize), 10) || DEFAULT_BATCH_SIZE, 1), 100)]
    );

    // Se cliente próprio, commitar imediatamente para liberar locks com menor duração
    if (ownClient) {
      await client.query('COMMIT');
    }

    return { rows: result.rows || [], client: ownClient ? null : client };
  } catch (err) {
    if (ownClient) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw err;
  } finally {
    if (ownClient && client) {
      client.release();
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Marcar entrada como delivered
// ---------------------------------------------------------------------------

/**
 * Marca uma entrada do outbox como 'delivered' após processamento bem-sucedido.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.outboxId
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function markDelivered({ companyId, outboxId }) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    await client.query(
      `UPDATE aioi_outbox
       SET status       = 'delivered',
           processed_at = now(),
           updated_at   = now()
       WHERE id         = $1::uuid
         AND company_id = $2::uuid
         AND status     = 'processing'`,
      [outboxId, companyId]
    );

    await client.query('COMMIT');
    return { ok: true };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro ao marcar delivered`, { outbox_id: outboxId, error: err.message });
    return { ok: false, error: err.message };
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// 3. Registrar falha e aplicar retry (ou marcar como failed)
// ---------------------------------------------------------------------------

/**
 * Registra falha em uma entrada do outbox.
 * - Se attempts + 1 <= MAX_ATTEMPTS: volta para 'pending' com next_attempt_at no futuro
 * - Se attempts + 1 > MAX_ATTEMPTS: marca como 'failed'
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.outboxId
 * @param {number} params.currentAttempts — valor atual de attempts ANTES desta falha
 * @param {string} [params.errorMessage]
 * @returns {Promise<{ ok: boolean, new_status: 'pending'|'failed', next_attempt_at?: string, error?: string }>}
 */
async function markFailedOrRetry({ companyId, outboxId, currentAttempts, errorMessage }) {
  const newAttempts = (parseInt(String(currentAttempts), 10) || 0) + 1;
  const isFinal = newAttempts > MAX_ATTEMPTS;
  const newStatus = isFinal ? 'failed' : 'pending';
  const nextAttemptAt = isFinal ? null : _nextAttemptAt(newAttempts);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    await client.query(
      `UPDATE aioi_outbox
       SET status          = $3,
           attempts        = $4,
           last_error      = $5,
           next_attempt_at = COALESCE($6::timestamptz, now()),
           updated_at      = now()
       WHERE id            = $1::uuid
         AND company_id    = $2::uuid`,
      [
        outboxId,
        companyId,
        newStatus,
        newAttempts,
        errorMessage ? String(errorMessage).slice(0, 500) : null,
        nextAttemptAt
      ]
    );

    await client.query('COMMIT');
    return { ok: true, new_status: newStatus, next_attempt_at: nextAttemptAt };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro ao registrar falha/retry`, { outbox_id: outboxId, error: err.message });
    return { ok: false, new_status: 'pending', error: err.message };
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// 4. Transição open → triaged no IOE
// ---------------------------------------------------------------------------

/**
 * Atualiza o status do IOE de 'open' para 'triaged' após classificação.
 * Persiste também a classification_conf resultante.
 *
 * TRANSIÇÕES PERMITIDAS NESTA FASE (P0.3): open → triaged APENAS.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.ioeId
 * @param {string} params.resolvedCategory
 * @param {number} params.classificationConfidence
 * @returns {Promise<{ ok: boolean, updated: boolean, error?: string }>}
 */
async function transitionIoeToTriaged({ companyId, ioeId, resolvedCategory, classificationConfidence }) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const result = await client.query(
      `UPDATE industrial_operational_events
       SET status               = 'triaged',
           category             = $3,
           classification_conf  = $4::smallint,
           updated_at           = now()
       WHERE id         = $2::uuid
         AND company_id = $1::uuid
         AND status     = 'open'
       RETURNING id`,
      [
        companyId,
        ioeId,
        resolvedCategory,
        Math.min(99, Math.max(0, Math.round(Number(classificationConfidence) || 0)))
      ]
    );

    await client.query('COMMIT');

    const updated = result.rows.length > 0;
    return { ok: true, updated };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro ao transicionar IOE → triaged`, {
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
// 5. Busca de IOE associado a uma entrada de outbox
// ---------------------------------------------------------------------------

/**
 * Busca o IOE associado a uma entrada do outbox.
 * Usado pelo consumer para carregar os metadados necessários à classificação.
 *
 * @param {string} companyId
 * @param {string} ioeId
 * @returns {Promise<object|null>}
 */
async function fetchIoe(companyId, ioeId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const result = await client.query(
      `SELECT id, company_id, status, category, source_type, priority_band, priority_score,
              truth_state, entity_type, entity_id, equipment_id, classification_conf,
              audience_key, correlation_id, evidence_refs
       FROM industrial_operational_events
       WHERE id         = $1::uuid
         AND company_id = $2::uuid`,
      [ioeId, companyId]
    );

    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro ao buscar IOE`, { ioe_id: ioeId, error: err.message });
    return null;
  } finally {
    client.release();
  }
}

module.exports = {
  pickBatch,
  markDelivered,
  markFailedOrRetry,
  transitionIoeToTriaged,
  fetchIoe,
  MAX_ATTEMPTS,
  BACKOFF_MINUTES,
  _nextAttemptAt
};
