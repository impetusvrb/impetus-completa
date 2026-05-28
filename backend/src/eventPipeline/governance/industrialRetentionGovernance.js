'use strict';

/**
 * Retention governance WAVE 2 — alinha archive/TTL com retentionPolicyRegistry.
 */

const registry = require('../../governance/retentionPolicyRegistry');
const {
  isIndustrialArchiveEnabled,
  archiveDeliveredAfterDays,
  industrialBackboneMode
} = require('../industrialFlags');

const TABLES = ['industrial_event_outbox', 'industrial_event_dlq', 'industrial_event_replay_log', 'industrial_event_archive'];

function getPolicyForTable(tableName) {
  if (typeof registry.getPolicy === 'function') {
    return registry.getPolicy(tableName);
  }
  return null;
}

function validateRetentionPreconditions() {
  const issues = [];
  for (const table of TABLES) {
    const p = getPolicyForTable(table);
    if (!p) issues.push({ table, code: 'NO_POLICY' });
    else if (p.ttl_days == null && table !== 'industrial_event_archive') {
      issues.push({ table, code: 'TTL_MISSING' });
    }
  }
  if (isIndustrialArchiveEnabled()) {
    const outboxPolicy = getPolicyForTable('industrial_event_outbox');
    const archiveDays = archiveDeliveredAfterDays();
    if (outboxPolicy && outboxPolicy.ttl_days != null && archiveDays >= outboxPolicy.ttl_days) {
      issues.push({
        table: 'industrial_event_outbox',
        code: 'ARCHIVE_WINDOW_VS_TTL',
        detail: `archive_days=${archiveDays} ttl_days=${outboxPolicy.ttl_days}`
      });
    }
  }
  return {
    ok: issues.length === 0,
    mode: industrialBackboneMode(),
    archive_enabled: isIndustrialArchiveEnabled(),
    issues
  };
}

async function getGovernanceSnapshot() {
  const pre = validateRetentionPreconditions();
  let counts = {};
  try {
    const db = require('../../db');
    for (const table of TABLES) {
      try {
        const r = await db.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
        counts[table] = r.rows[0]?.c || 0;
      } catch (_e) {
        counts[table] = null;
      }
    }
  } catch (_e) {}

  const policies = {};
  for (const table of TABLES) {
    const p = getPolicyForTable(table);
    policies[table] = p
      ? { ttl_days: p.ttl_days, archive_days: p.archive_days, action: p.action }
      : null;
  }

  return {
    ok: pre.ok,
    preconditions: pre,
    row_counts: counts,
    policies,
    archive_delivered_days: archiveDeliveredAfterDays()
  };
}

module.exports = {
  validateRetentionPreconditions,
  getGovernanceSnapshot,
  TABLES
};
