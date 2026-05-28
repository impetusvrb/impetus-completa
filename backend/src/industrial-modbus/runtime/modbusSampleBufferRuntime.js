'use strict';

const db = require('../../db');
const tracing = require('../observability/modbusTracing');

async function bufferSample(companyId, registerKey, payload) {
  try {
    await db.query(
      `INSERT INTO modbus_sample_buffer (company_id, register_key, payload)
       VALUES ($1::uuid, $2, $3::jsonb)`,
      [companyId, registerKey, JSON.stringify(payload || {})]
    );
    return { buffered: true };
  } catch (err) {
    return { buffered: false, error: err?.message };
  }
}

async function replayPending(companyId, handler, limit = 500) {
  const r = await db.query(
    `SELECT id, register_key, payload FROM modbus_sample_buffer
     WHERE company_id = $1::uuid AND replayed_at IS NULL AND expires_at > now()
     ORDER BY received_at ASC LIMIT $2`,
    [companyId, limit]
  );

  let replayed = 0;
  let failed = 0;

  for (const row of r.rows) {
    try {
      const ok = await handler(row.register_key, row.payload, { replay: true });
      if (ok !== false) {
        await db.query('UPDATE modbus_sample_buffer SET replayed_at = now() WHERE id = $1::uuid', [row.id]);
        replayed += 1;
      } else {
        failed += 1;
      }
    } catch (err) {
      failed += 1;
      await tracing.trace(companyId, 'replay_failed', 'error', { register_key: row.register_key, error: err?.message });
    }
  }

  await tracing.trace(companyId, 'buffer_replay', 'ok', { replayed, failed });
  return { replayed, failed, pending: r.rows.length };
}

async function purgeExpired() {
  const res = await db.query('DELETE FROM modbus_sample_buffer WHERE expires_at < now()');
  return { purged: res.rowCount || 0 };
}

module.exports = { bufferSample, replayPending, purgeExpired };
