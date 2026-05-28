'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('../config/rolloutCenterFlags');

async function recordAudit(row = {}) {
  if (!flags.shouldPersistAudit()) {
    return { id: null, persisted: false };
  }
  const id = uuidv4();
  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO rollout_center_audit
       (id, company_id, capability_id, action, mode, from_mode, to_mode, gate_passed,
        actor_user_id, explainability, payload)
       VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9::uuid,$10::jsonb,$11::jsonb)`,
      [
        id,
        row.companyId || null,
        row.capabilityId,
        row.action || 'gate_eval',
        flags.rolloutCenterMode(),
        row.fromMode || null,
        row.toMode || null,
        row.gatePassed === true,
        row.actorUserId || null,
        JSON.stringify(row.explainability || {}),
        JSON.stringify(row.payload || {})
      ]
    );
    return { id, persisted: true };
  } catch (err) {
    if (err.code === '42P01') return { id: null, persisted: false, table_missing: true };
    throw err;
  }
}

async function listRecent(companyId, limit = 50) {
  try {
    const db = require('../../db');
    let sql = `SELECT * FROM rollout_center_audit`;
    const params = [];
    if (companyId) {
      sql += ` WHERE company_id = $1::uuid`;
      params.push(companyId);
    }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(Math.min(200, limit));
    const r = await db.query(sql, params);
    return r.rows || [];
  } catch (err) {
    if (err.code === '42P01') return [];
    throw err;
  }
}

module.exports = { recordAudit, listRecent };
