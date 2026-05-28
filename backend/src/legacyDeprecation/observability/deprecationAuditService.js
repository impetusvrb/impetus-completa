'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('../config/deprecationGovernanceFlags');

async function recordAudit({
  companyId,
  legacyId,
  modulePath,
  replacementId,
  callerHint,
  actorUserId,
  payload = {}
}) {
  if (!flags.shouldPersistAudit()) {
    return { id: null, persisted: false };
  }

  const id = uuidv4();
  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO legacy_deprecation_audit
       (id, company_id, legacy_id, module_path, replacement_id, mode, caller_hint, actor_user_id, payload)
       VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8::uuid,$9::jsonb)`,
      [
        id,
        companyId,
        legacyId,
        modulePath,
        replacementId,
        flags.deprecationMode(),
        callerHint,
        actorUserId,
        JSON.stringify(payload)
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
    let sql = `SELECT * FROM legacy_deprecation_audit`;
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
