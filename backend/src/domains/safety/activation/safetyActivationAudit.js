'use strict';

const _entries = [];
const MAX = 200;

function _persistToIndustrialAudit(entry) {
  try {
    const { writeIndustrialAuditEvent } = require('../../../../governance/industrialAuditStructure');
    writeIndustrialAuditEvent({
      event_type: entry.event || 'safety_activation_audit',
      domain: 'safety',
      actor_id: entry.actor_id || entry.meta?.actor_id || null,
      actor_role: entry.actor_role || null,
      company_id: entry.company_id || null,
      traceability_id: entry.traceability_id || null,
      payload: entry,
      severity: entry.severity || 'info'
    });
  } catch (_) {}
}

function recordSafetyActivationAudit(entry) {
  const record = {
    ts: new Date().toISOString(),
    domain: 'safety',
    ...entry
  };
  _entries.unshift(record);
  if (_entries.length > MAX) _entries.length = MAX;
  _persistToIndustrialAudit(record);
}

function listRecentActivationAudit(limit = 50) {
  return _entries.slice(0, Math.min(limit, MAX));
}

module.exports = {
  recordSafetyActivationAudit,
  listRecentActivationAudit
};
