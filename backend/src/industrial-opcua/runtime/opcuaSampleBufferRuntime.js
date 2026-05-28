'use strict';

const db = require('../../db');
const tracing = require('../observability/opcuaTracing');

async function bufferSample(companyId, nodeId, payload, statusCode = 'Good') {
  try {
    await db.query(
      `INSERT INTO opcua_sample_buffer (company_id, node_id, payload, status_code)
       VALUES ($1::uuid, $2, $3::jsonb, $4)`,
      [companyId, nodeId, JSON.stringify(payload || {}), statusCode]
    );
    return { buffered: true };
  } catch (err) {
    return { buffered: false, error: err?.message };
  }
}

async function replayPending(companyId, handler, limit = 500) {
  const r = await db.query(
    `SELECT id, node_id, payload, status_code FROM opcua_sample_buffer
     WHERE company_id = $1::uuid AND replayed_at IS NULL AND expires_at > now()
     ORDER BY received_at ASC LIMIT $2`,
    [companyId, limit]
  );

  let replayed = 0;
  let failed = 0;

  for (const row of r.rows) {
    try {
      const ok = await handler(row.node_id, row.payload, { status: row.status_code, replay: true });
      if (ok !== false) {
        await db.query('UPDATE opcua_sample_buffer SET replayed_at = now() WHERE id = $1::uuid', [row.id]);
        replayed += 1;
      } else {
        failed += 1;
      }
    } catch (err) {
      failed += 1;
      await tracing.trace(companyId, 'replay_failed', 'error', { node_id: row.node_id, error: err?.message });
    }
  }

  await tracing.trace(companyId, 'buffer_replay', 'ok', { replayed, failed });
  return { replayed, failed, pending: r.rows.length };
}

async function purgeExpired() {
  const res = await db.query('DELETE FROM opcua_sample_buffer WHERE expires_at < now()');
  return { purged: res.rowCount || 0 };
}

module.exports = { bufferSample, replayPending, purgeExpired };
