'use strict';

const counters = { evaluations: 0, approved: 0, denied: 0, guardSuccess: 0, guardFailed: 0 };

function recordEvaluation(decision) {
  counters.evaluations += 1;
  if (decision === 'GO_LIVE_APPROVED' || decision === 'GO_LIVE_APPROVED_WITH_REMARKS') counters.approved += 1;
  if (decision === 'GO_LIVE_DENIED') counters.denied += 1;
}

function recordGuard(status) {
  if (status === 'GO_LIVE_GUARD_SUCCESS') counters.guardSuccess += 1;
  if (status === 'GO_LIVE_GUARD_FAILED') counters.guardFailed += 1;
}

function getSnapshot() {
  return { ...counters };
}

function resetForTests() {
  counters.evaluations = 0;
  counters.approved = 0;
  counters.denied = 0;
  counters.guardSuccess = 0;
  counters.guardFailed = 0;
}

module.exports = { recordEvaluation, recordGuard, getSnapshot, resetForTests };
