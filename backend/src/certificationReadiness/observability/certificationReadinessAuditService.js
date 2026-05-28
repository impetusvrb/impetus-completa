'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('../config/certificationReadinessFlags');

async function recordAudit(row = {}) {
  if (!flags.shouldPersistSnapshots() && row.action !== 'snapshot') {
    return { id: null, persisted: false };
  }
  const id = uuidv4();
  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO certification_readiness_audit (id, company_id, action, mode, actor_user_id, payload)
       VALUES ($1::uuid,$2::uuid,$3,$4,$5::uuid,$6::jsonb)`,
      [
        id,
        row.companyId,
        row.action || 'assessment',
        flags.certificationMode(),
        row.actorUserId,
        JSON.stringify(row.payload || {})
      ]
    );
    return { id, persisted: true };
  } catch (err) {
    if (err.code === '42P01') return { id: null, persisted: false, table_missing: true };
    throw err;
  }
}

async function saveSnapshot(companyId, report) {
  if (!flags.shouldPersistSnapshots()) {
    return { id: null, persisted: false };
  }
  const id = uuidv4();
  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO certification_readiness_snapshots
       (id, company_id, framework, overall_score, mode, gap_count, report)
       VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7::jsonb)`,
      [
        id,
        companyId,
        report.framework_filter || 'ALL',
        report.gap_analysis?.overall_score || 0,
        flags.certificationMode(),
        report.gap_analysis?.gap_count || 0,
        JSON.stringify(report)
      ]
    );
    return { id, persisted: true };
  } catch (err) {
    if (err.code === '42P01') return { id: null, persisted: false, table_missing: true };
    throw err;
  }
}

async function listSnapshots(companyId, limit = 20) {
  try {
    const db = require('../../db');
    let sql = `SELECT id, company_id, framework, overall_score, gap_count, mode, created_at
               FROM certification_readiness_snapshots`;
    const params = [];
    if (companyId) {
      sql += ` WHERE company_id = $1::uuid`;
      params.push(companyId);
    }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(Math.min(50, limit));
    const r = await db.query(sql, params);
    return r.rows || [];
  } catch (err) {
    if (err.code === '42P01') return [];
    throw err;
  }
}

module.exports = { recordAudit, saveSnapshot, listSnapshots };
