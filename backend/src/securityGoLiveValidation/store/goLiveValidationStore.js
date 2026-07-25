'use strict';

let lastEvaluation = null;
let guardState = null;

function setLastEvaluation(evaluation) {
  lastEvaluation = evaluation;
}

function getLastEvaluation() {
  return lastEvaluation;
}

function setGuardState(state) {
  guardState = state;
}

function getGuardState() {
  return guardState;
}

function resetForTests() {
  lastEvaluation = null;
  guardState = null;
}

module.exports = {
  setLastEvaluation,
  getLastEvaluation,
  setGuardState,
  getGuardState,
  resetForTests
};
