'use strict';

const crypto = require('crypto');
const flags = require('../config/finalConsolidationAuditFlags');

async function recordAudit({ companyId, actorUserId, action, payload = {} }) {
  if (!flags.shouldPersistSnapshots() && flags.consolidationAuditMode() === 'shadow') {
    return { persisted: false, shadow: true };
  }
  try {
    const db = require('../../db');
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO final_consolidation_audit (id, company_id, action, mode, actor_user_id, payload)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        id,
        companyId || null,
        action,
        flags.consolidationAuditMode(),
        actorUserId || null,
        JSON.stringify(payload)
      ]
    );
    return { persisted: true, id };
  } catch (e) {
    console.warn('[FINAL_CONSOLIDATION_AUDIT]', e?.message);
    return { persisted: false, error: e?.message };
  }
}

async function saveSnapshot(companyId, report) {
  if (!flags.shouldPersistSnapshots()) return { id: null, persisted: false };
  try {
    const db = require('../../db');
    const id = crypto.randomUUID();
    const scores = report.scores || {};
    await db.query(
      `INSERT INTO final_consolidation_snapshots
       (id, company_id, classification, overall_score, maturity_score, mode, report)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        id,
        companyId || null,
        report.classification?.classification || 'unknown',
        scores.overall_weighted || 0,
        scores.maturity_score_final || 0,
        flags.consolidationAuditMode(),
        JSON.stringify(report)
      ]
    );
    return { id, persisted: true };
  } catch (e) {
    console.warn('[FINAL_CONSOLIDATION_SNAPSHOT]', e?.message);
    return { id: null, persisted: false, error: e?.message };
  }
}

async function listSnapshots(companyId, limit = 20) {
  try {
    const db = require('../../db');
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const r = companyId
      ? await db.query(
          `SELECT id, company_id, classification, overall_score, maturity_score, mode, created_at
           FROM final_consolidation_snapshots WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`,
          [companyId, lim]
        )
      : await db.query(
          `SELECT id, company_id, classification, overall_score, maturity_score, mode, created_at
           FROM final_consolidation_snapshots ORDER BY created_at DESC LIMIT $1`,
          [lim]
        );
    return r.rows;
  } catch (_e) {
    return [];
  }
}

module.exports = { recordAudit, saveSnapshot, listSnapshots };
