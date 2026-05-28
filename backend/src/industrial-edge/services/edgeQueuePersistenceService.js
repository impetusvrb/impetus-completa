'use strict';

const db = require('../../db');
const flags = require('../config/edgeRuntimeFlags');

async function ensureSchema() {
  const fs = require('fs');
  const path = require('path');
  const sql = fs.readFileSync(path.join(__dirname, '../../models/industrial_edge_migration.sql'), 'utf8');
  await db.query(sql);
  return { ok: true };
}

async function persistEnqueue(companyId, item) {
  const r = await db.query(
    `INSERT INTO edge_runtime_queue
     (company_id, edge_sequence, idempotency_key, connector_source, payload)
     VALUES ($1::uuid, $2, $3, $4, $5::jsonb)
     RETURNING id`,
    [
      companyId,
      item.sequence,
      item.idempotency_key || null,
      item.connector_source || 'edge',
      JSON.stringify(item.payload || {}),
    ]
  );
  return { persisted: r.rows.length > 0, id: r.rows[0]?.id };
}

async function markSynced(ids) {
  if (!ids?.length) return { updated: 0 };
  const res = await db.query(
    `UPDATE edge_runtime_queue SET synced_at = now() WHERE id = ANY($1::uuid[])`,
    [ids]
  );
  return { updated: res.rowCount || 0 };
}

async function loadPending(companyId, limit = 500) {
  const r = await db.query(
    `SELECT id, edge_sequence, idempotency_key, connector_source, payload, enqueued_at
     FROM edge_runtime_queue
     WHERE company_id = $1::uuid AND synced_at IS NULL AND expires_at > now()
     ORDER BY edge_sequence ASC LIMIT $2`,
    [companyId, limit]
  );
  return r.rows;
}

async function purgeSynced(olderThanDays = 7) {
  const res = await db.query(
    `DELETE FROM edge_runtime_queue
     WHERE synced_at IS NOT NULL AND synced_at < now() - ($1::int || ' days')::interval`,
    [olderThanDays]
  );
  return { purged: res.rowCount || 0 };
}

async function getQueueStats(companyId) {
  const r = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE synced_at IS NULL)::int AS pending,
       COUNT(*) FILTER (WHERE synced_at IS NOT NULL)::int AS synced
     FROM edge_runtime_queue WHERE company_id = $1::uuid`,
    [companyId]
  );
  return r.rows[0] || { pending: 0, synced: 0 };
}

module.exports = {
  ensureSchema,
  persistEnqueue,
  markSynced,
  loadPending,
  purgeSynced,
  getQueueStats,
};
