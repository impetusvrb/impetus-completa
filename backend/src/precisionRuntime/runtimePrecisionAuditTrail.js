'use strict';

const MAX = 400;
const _trail = [];

function recordPrecisionAudit(entry) {
  _trail.push({
    ts: new Date().toISOString(),
    ...entry
  });
  if (_trail.length > MAX) _trail.shift();
  return entry;
}

function listPrecisionAudit(limit = 50) {
  return _trail.slice(-limit).reverse();
}

function clearPrecisionAudit() {
  _trail.length = 0;
}

module.exports = { recordPrecisionAudit, listPrecisionAudit, clearPrecisionAudit };
