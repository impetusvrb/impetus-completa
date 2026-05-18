'use strict';

const auditTail = [];
const MAX = 200;

function recordEnvironmentPublicationAudit(entry) {
  auditTail.push({
    ts: new Date().toISOString(),
    domain: 'environment',
    ...entry
  });
  if (auditTail.length > MAX) auditTail.shift();
}

function getEnvironmentPublicationAuditTail(n = 20) {
  return auditTail.slice(-n);
}

module.exports = {
  recordEnvironmentPublicationAudit,
  getEnvironmentPublicationAuditTail
};
