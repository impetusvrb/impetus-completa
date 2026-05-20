'use strict';

const MAX = 300;
const _trace = [];

function traceDecision(entry) {
  const row = { ts: new Date().toISOString(), ...entry };
  _trace.push(row);
  if (_trace.length > MAX) _trace.shift();
  return row;
}

function listDecisionTrace(limit = 40) {
  return _trace.slice(-limit).reverse();
}

module.exports = { traceDecision, listDecisionTrace };
