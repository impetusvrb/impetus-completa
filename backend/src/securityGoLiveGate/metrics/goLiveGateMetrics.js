'use strict';

const flags = require('../config/securityGoLiveGateFlags');

let metrics = { evaluations: 0, blocked: 0, approved: 0 };

function resetForTests() {
  metrics = { evaluations: 0, blocked: 0, approved: 0 };
}

function recordEvaluation(decision) {
  metrics.evaluations++;
  if (decision === 'GO_LIVE_APPROVED' || decision === 'GO_LIVE_APPROVED_WITH_REMARKS') {
    metrics.approved++;
  } else {
    metrics.blocked++;
  }
}

function getSnapshot() {
  return { ...metrics, threshold: flags.integrityThreshold() };
}

module.exports = { resetForTests, recordEvaluation, getSnapshot };
