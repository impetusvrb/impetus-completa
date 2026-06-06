'use strict';

/**
 * AIOI-P0.3 — Métricas do Consumer Layer
 *
 * Responsabilidade: coletar e reportar métricas observacionais da fila aioi_outbox.
 *
 * REGRAS:
 *   ✓ Somente leitura — nenhuma mutação de estado
 *   ✓ RLS via set_config antes de cada query
 *   ✓ Sem dashboard, sem API REST, sem worker próprio
 *   ✓ Compatível com padrão de observabilidade IMPETUS (console.info estruturado)
 *
 * Métricas expostas:
 *   - pending_count       — entradas aguardando processamento
 *   - processing_count    — entradas em processamento ativo
 *   - failed_count        — entradas que esgotaram tentativas
 *   - delivered_count     — entradas entregues com sucesso
 *   - avg_processing_time_ms — tempo médio de processamento (created_at → processed_at)
 *
 * Labels obrigatórios nos logs:
 *   AIOI_OUTBOX_PICKED, AIOI_CLASSIFICATION_COMPLETED,
 *   AIOI_OUTBOX_RETRY, AIOI_OUTBOX_FAILED, AIOI_OUTBOX_DELIVERED
 */

const db = require('../../db');

const LAYER = 'AIOI_CONSUMER_METRICS';

// ---------------------------------------------------------------------------
// Contadores em memória para a sessão atual (sem persistência — apenas runtime)
// Úteis para diagnóstico sem query adicional.
// ---------------------------------------------------------------------------
let _sessionCounters = {
  picked:          0,
  classified:      0,
  retried:         0,
  failed:          0,
  delivered:       0,
  total_proc_ms:   0,
  proc_samples:    0
};

/**
 * Incrementa contadores de sessão e emite log estruturado.
 * Chamado pelo classificationConsumer ao processar mensagens.
 */
function recordPicked(companyId) {
  _sessionCounters.picked++;
  console.info(`[${LAYER}] AIOI_OUTBOX_PICKED`, { company_id: companyId, session_total: _sessionCounters.picked });
}

function recordClassified(companyId, ioeId, elapsedMs) {
  _sessionCounters.classified++;
  if (typeof elapsedMs === 'number' && elapsedMs >= 0) {
    _sessionCounters.total_proc_ms += elapsedMs;
    _sessionCounters.proc_samples++;
  }
  console.info(`[${LAYER}] AIOI_CLASSIFICATION_COMPLETED`, {
    company_id: companyId,
    ioe_id:     ioeId,
    elapsed_ms: elapsedMs,
    session_total: _sessionCounters.classified
  });
}

function recordRetry(companyId, outboxId, attempts) {
  _sessionCounters.retried++;
  console.warn(`[${LAYER}] AIOI_OUTBOX_RETRY`, {
    company_id: companyId,
    outbox_id:  outboxId,
    attempts,
    session_total: _sessionCounters.retried
  });
}

function recordFailed(companyId, outboxId, reason) {
  _sessionCounters.failed++;
  console.error(`[${LAYER}] AIOI_OUTBOX_FAILED`, {
    company_id: companyId,
    outbox_id:  outboxId,
    reason,
    session_total: _sessionCounters.failed
  });
}

function recordDelivered(companyId, outboxId) {
  _sessionCounters.delivered++;
  console.info(`[${LAYER}] AIOI_OUTBOX_DELIVERED`, {
    company_id: companyId,
    outbox_id:  outboxId,
    session_total: _sessionCounters.delivered
  });
}

/**
 * Retorna snapshot dos contadores da sessão (sem query).
 */
function getSessionCounters() {
  const avgMs = _sessionCounters.proc_samples > 0
    ? Math.round(_sessionCounters.total_proc_ms / _sessionCounters.proc_samples)
    : null;

  return {
    ..._sessionCounters,
    avg_processing_time_ms: avgMs
  };
}

/**
 * Zera contadores de sessão (útil para testes).
 */
function resetSessionCounters() {
  _sessionCounters = {
    picked:        0,
    classified:    0,
    retried:       0,
    failed:        0,
    delivered:     0,
    total_proc_ms: 0,
    proc_samples:  0
  };
}

// ---------------------------------------------------------------------------
// Queries de métricas por tenant (somente leitura)
// ---------------------------------------------------------------------------

/**
 * Coleta contagens de status do aioi_outbox para um tenant.
 * Usa set_config para garantir que RLS filtra corretamente.
 *
 * @param {string} companyId
 * @returns {Promise<{
 *   pending_count: number,
 *   processing_count: number,
 *   failed_count: number,
 *   delivered_count: number,
 *   avg_processing_time_ms: number|null
 * }>}
 */
async function getOutboxMetrics(companyId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const result = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')    AS pending_count,
         COUNT(*) FILTER (WHERE status = 'processing') AS processing_count,
         COUNT(*) FILTER (WHERE status = 'failed')     AS failed_count,
         COUNT(*) FILTER (WHERE status = 'delivered')  AS delivered_count,
         ROUND(
           AVG(
             EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000
           ) FILTER (WHERE processed_at IS NOT NULL)
         ) AS avg_processing_time_ms
       FROM aioi_outbox
       WHERE company_id = $1::uuid
         AND consumer_type = 'classification'`,
      [companyId]
    );

    await client.query('COMMIT');

    const row = result.rows[0] || {};
    return {
      pending_count:          parseInt(row.pending_count   || '0', 10),
      processing_count:       parseInt(row.processing_count || '0', 10),
      failed_count:           parseInt(row.failed_count    || '0', 10),
      delivered_count:        parseInt(row.delivered_count  || '0', 10),
      avg_processing_time_ms: row.avg_processing_time_ms != null
        ? Number(row.avg_processing_time_ms)
        : null
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro ao coletar métricas`, { company_id: companyId, error: err.message });
    return {
      pending_count:          0,
      processing_count:       0,
      failed_count:           0,
      delivered_count:        0,
      avg_processing_time_ms: null
    };
  } finally {
    client.release();
  }
}

/**
 * Coleta contagens globais (cross-tenant) para monitoring interno.
 * Usa bypass RLS — somente para uso em scripts de monitoramento, nunca em runtime de produto.
 *
 * @returns {Promise<{ total_pending: number, total_failed: number, total_delivered: number }>}
 */
async function getGlobalOutboxSummary() {
  try {
    const result = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')    AS total_pending,
         COUNT(*) FILTER (WHERE status = 'failed')     AS total_failed,
         COUNT(*) FILTER (WHERE status = 'delivered')  AS total_delivered
       FROM aioi_outbox
       WHERE consumer_type = 'classification'`
    );
    const row = result.rows[0] || {};
    return {
      total_pending:   parseInt(row.total_pending   || '0', 10),
      total_failed:    parseInt(row.total_failed    || '0', 10),
      total_delivered: parseInt(row.total_delivered || '0', 10)
    };
  } catch (err) {
    console.error(`[${LAYER}] Erro ao coletar sumário global`, { error: err.message });
    return { total_pending: 0, total_failed: 0, total_delivered: 0 };
  }
}

module.exports = {
  recordPicked,
  recordClassified,
  recordRetry,
  recordFailed,
  recordDelivered,
  getSessionCounters,
  resetSessionCounters,
  getOutboxMetrics,
  getGlobalOutboxSummary
};
