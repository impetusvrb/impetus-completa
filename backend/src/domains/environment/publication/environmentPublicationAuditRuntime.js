'use strict';

const auditTail = [];
const MAX = 200;

function _persistToIndustrialAudit(entry) {
  try {
    const { writeIndustrialAuditEvent } = require('../../../../governance/industrialAuditStructure');
    writeIndustrialAuditEvent({
      event_type: 'environment_publication_audit',
      domain: 'environment',
      actor_id: entry.actor || null,
      actor_role: null,
      company_id: entry.company_id || null,
      traceability_id: null,
      payload: entry,
      severity: 'info'
    });
  } catch (_) {}
}

function recordEnvironmentPublicationAudit(entry) {
  const record = {
    ts: new Date().toISOString(),
    domain: 'environment',
    ...entry
  };
  auditTail.push(record);
  if (auditTail.length > MAX) auditTail.shift();
  _persistToIndustrialAudit(record);
}

function getEnvironmentPublicationAuditTail(n = 20) {
  return auditTail.slice(-n);
}

module.exports = {
  recordEnvironmentPublicationAudit,
  getEnvironmentPublicationAuditTail
};
