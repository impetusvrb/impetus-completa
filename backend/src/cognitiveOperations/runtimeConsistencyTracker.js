'use strict';

const _decisions = [];

function trackDecision(decisionKey) {
  _decisions.push({ key: decisionKey, ts: Date.now() });
  if (_decisions.length > 80) _decisions.shift();
  const recent = _decisions.slice(-10);
  const unique = new Set(recent.map((d) => d.key));
  return { oscillation: unique.size / Math.max(1, recent.length), unique_count: unique.size };
}

function clearConsistencyTracker() {
  _decisions.length = 0;
}

module.exports = { trackDecision, clearConsistencyTracker };
