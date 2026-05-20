'use strict';

const { logPhaseK } = require('./phaseKLogger');

const _auditLog = [];

function recordPublicationAudit(record) {
  const entry = {
    id: `pub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    ...record
  };
  _auditLog.push(entry);
  if (_auditLog.length > 2000) _auditLog.shift();

  try {
    const audit = require('../audit/cognitiveGovernanceAuditFeed');
    audit.appendOperational({ type: 'semantic_publication', ...entry });
  } catch {
    /* optional */
  }

  return entry;
}

function listPublicationAudit(limit = 100) {
  return _auditLog.slice(-limit);
}

function clearForTests() {
  _auditLog.length = 0;
}

module.exports = { recordPublicationAudit, listPublicationAudit, clearForTests };
