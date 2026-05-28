'use strict';

/**
 * PROMPT 32 — Final consolidation audit flags.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function envMode(name, allowed, defaultValue) {
  const v = String(process.env[name] || defaultValue).trim().toLowerCase();
  return allowed.includes(v) ? v : defaultValue;
}

function consolidationAuditMode() {
  return envMode('IMPETUS_FINAL_CONSOLIDATION_AUDIT_MODE', ['off', 'shadow', 'audit', 'on'], 'on');
}

function isFinalConsolidationAuditActive() {
  return consolidationAuditMode() !== 'off' || envBool('IMPETUS_FINAL_CONSOLIDATION_AUDIT_ENABLED', true);
}

function shouldPersistSnapshots() {
  const m = consolidationAuditMode();
  return m === 'audit' || m === 'on';
}

module.exports = {
  consolidationAuditMode,
  isFinalConsolidationAuditActive,
  shouldPersistSnapshots,
  envBool
};
