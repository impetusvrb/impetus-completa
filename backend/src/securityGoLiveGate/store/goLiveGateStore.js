'use strict';

let lastEvaluation = null;
let observationState = null;

function resetForTests() {
  lastEvaluation = null;
  observationState = null;
}

function setLastEvaluation(evalResult) {
  lastEvaluation = evalResult;
}

function getLastEvaluation() {
  return lastEvaluation;
}

function setObservationState(state) {
  observationState = state;
}

function getObservationState() {
  return observationState;
}

module.exports = {
  resetForTests,
  setLastEvaluation,
  getLastEvaluation,
  setObservationState,
  getObservationState
};
