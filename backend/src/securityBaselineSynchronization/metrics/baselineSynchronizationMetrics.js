'use strict';

const counters = {
  evaluations: 0,
  approved: 0,
  denied: 0
};

function recordEvaluation(decision) {
  counters.evaluations += 1;
  if (decision === 'BASELINE_SYNCHRONIZATION_APPROVED') counters.approved += 1;
  if (decision === 'BASELINE_SYNCHRONIZATION_DENIED') counters.denied += 1;
}

function getSnapshot() {
  return { ...counters };
}

function resetForTests() {
  counters.evaluations = 0;
  counters.approved = 0;
  counters.denied = 0;
}

module.exports = {
  recordEvaluation,
  getSnapshot,
  resetForTests
};
