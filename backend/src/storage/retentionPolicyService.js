'use strict';

/**
 * WAVE 3 — políticas de retenção declarativas (purge inactivo por defeito).
 */

const flags = require('./storageFlags');

const PROFILE_CODES = Object.freeze(['default', 'telemetry', 'operational', 'audit', 'workflow']);

async function listPolicies() {
  try {
    const db = require('../db');
    const r = await db.query(
      `SELECT policy_code, hot_days, warm_days, cold_days, archive_days, description, purge_enabled
       FROM impetus_retention_policy ORDER BY policy_code`
    );
    return { policies: r.rows || [] };
  } catch (err) {
    return { policies: [], error: err.message };
  }
}

async function getActivePolicy() {
  const code = flags.retentionProfile();
  const safe = PROFILE_CODES.includes(code) ? code : 'default';
  try {
    const db = require('../db');
    const r = await db.query(`SELECT * FROM impetus_retention_policy WHERE policy_code = $1`, [safe]);
    return r.rows && r.rows[0] ? r.rows[0] : null;
  } catch (_e) {
    return null;
  }
}

function resolveTierForAge(ageDays, policy) {
  if (!policy) return 'hot';
  if (policy.archive_days != null && ageDays >= policy.archive_days) return 'archive';
  if (ageDays >= policy.cold_days) return 'cold';
  if (ageDays >= policy.warm_days) return 'warm';
  if (ageDays >= policy.hot_days) return 'hot';
  return 'hot';
}

function evaluateRetentionPlan() {
  const policy = flags.retentionProfile();
  return {
    profile: policy,
    purge_would_run: flags.isStorageV3Enabled() && flags.envBool('IMPETUS_RETENTION_PURGE_ENABLED', false),
    note: 'WAVE 3 — apenas planeamento; purge requer IMPETUS_RETENTION_PURGE_ENABLED'
  };
}

module.exports = {
  PROFILE_CODES,
  listPolicies,
  getActivePolicy,
  resolveTierForAge,
  evaluateRetentionPlan
};
