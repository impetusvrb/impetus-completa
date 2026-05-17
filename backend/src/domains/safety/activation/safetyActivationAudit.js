'use strict';

const _entries = [];
const MAX = 200;

function recordSafetyActivationAudit(entry) {
  _entries.unshift({
    ts: new Date().toISOString(),
    domain: 'safety',
    ...entry
  });
  if (_entries.length > MAX) _entries.length = MAX;
}

function listRecentActivationAudit(limit = 50) {
  return _entries.slice(0, Math.min(limit, MAX));
}

module.exports = {
  recordSafetyActivationAudit,
  listRecentActivationAudit
};
