'use strict';

const { makePublicationAuditEntry } = require('../../../../../shared/domain-publication/domainPublicationAudit.cjs');

const _buf = [];
const MAX = 100;

function recordQualityActivationAudit(entry) {
  const row = makePublicationAuditEntry({ domain: 'quality', ...entry });
  _buf.push(row);
  if (_buf.length > MAX) _buf.shift();
  return row;
}

function listRecentActivationAudit(limit = 40) {
  return _buf.slice(-limit);
}

module.exports = { recordQualityActivationAudit, listRecentActivationAudit };
