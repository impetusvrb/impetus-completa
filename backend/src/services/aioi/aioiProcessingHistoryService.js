'use strict';

/**
 * AIOI-P1.4 — Processing History Service
 *
 * Persistência de transições do ciclo IOE em aioi_processing_history.
 * getProcessingHistory é READ ONLY.
 *
 * PROIBIÇÕES: somente INSERT nas novas tabelas; sem alteração de estado operacional.
 */

const db = require('../../db');
const { isValidUUID } = require('../../utils/security');
const metrics = require('./aioiPersistenceMetrics');

const TABLE = 'aioi_processing_history';

const VALID_SOURCE_LAYERS = Object.freeze([
  'adapter',
  'consumer',
  'decision',
  'approval',
  'execution',
  'outcome',
  'learning',
  'audit'
]);

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

function _buildHistoryIdempotencyKey({ ioeId, statusFrom, statusTo, sourceLayer, correlationId }) {
  const parts = [
    ioeId,
    statusFrom || 'null',
    statusTo,
    sourceLayer,
    correlationId || 'null'
  ];
  return parts.join(':');
}

/**
 * Registra transição de processamento (idempotente).
 *
 * @param {object} params
 * @returns {Promise<object>}
 */
async function recordTransition({
  companyId,
  ioeId,
  statusFrom,
  statusTo,
  sourceLayer,
  correlationId,
  idempotencyKey
}) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }
  if (!ioeId || !isValidUUID(String(ioeId))) {
    return { ok: false, error: 'ioeId inválido' };
  }
  if (!statusTo || String(statusTo).trim() === '') {
    return { ok: false, error: 'statusTo obrigatório' };
  }
  if (!sourceLayer || !VALID_SOURCE_LAYERS.includes(sourceLayer)) {
    return { ok: false, error: 'sourceLayer inválido' };
  }

  metrics.assertAllowedTable(TABLE);

  const key = idempotencyKey || _buildHistoryIdempotencyKey({
    ioeId, statusFrom, statusTo, sourceLayer, correlationId
  });

  const sql = `INSERT INTO ${TABLE}
    (company_id, ioe_id, status_from, status_to, source_layer, correlation_id, idempotency_key)
    VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
    ON CONFLICT (company_id, idempotency_key) DO NOTHING
    RETURNING id`;

  metrics.assertInsertOnlySql(sql);

  try {
    const row = await _withTenantClient(companyId, async (client) => {
      const result = await client.query(sql, [
        companyId,
        ioeId,
        statusFrom || null,
        String(statusTo).trim(),
        sourceLayer,
        correlationId ? String(correlationId).trim() : null,
        key
      ]);
      return result.rows[0] || null;
    });

    if (!row) {
      metrics.recordSkipped(companyId, `history_duplicate:${sourceLayer}`);
      return { ok: true, alreadyPersisted: true };
    }

    metrics.recordHistoryPersisted(companyId, ioeId, sourceLayer);
    return { ok: true, persisted: true, id: row.id };

  } catch (err) {
    metrics.recordError(companyId, 'recordTransition', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Consulta histórico de processamento de um IOE (READ ONLY).
 *
 * @param {object} params
 * @returns {Promise<object>}
 */
async function getProcessingHistory({ companyId, ioeId, limit = 100 }) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido', history: [] };
  }
  if (!ioeId || !isValidUUID(String(ioeId))) {
    return { ok: false, error: 'ioeId inválido', history: [] };
  }

  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 500);

  try {
    const rows = await _withTenantClient(companyId, async (client) => {
      const result = await client.query(
        `SELECT id, company_id, ioe_id, status_from, status_to,
                source_layer, correlation_id, created_at
         FROM ${TABLE}
         WHERE company_id = $1::uuid AND ioe_id = $2::uuid
         ORDER BY created_at ASC
         LIMIT $3`,
        [companyId, ioeId, lim]
      );
      return result.rows || [];
    });

    return { ok: true, history: rows, count: rows.length };

  } catch (err) {
    metrics.recordError(companyId, 'getProcessingHistory', err.message);
    return { ok: false, error: err.message, history: [] };
  }
}

module.exports = {
  VALID_SOURCE_LAYERS,
  recordTransition,
  getProcessingHistory
};
