'use strict';

let lastEvaluation = null;

function setLastEvaluation(evaluation) {
  lastEvaluation = evaluation;
}

function getLastEvaluation() {
  return lastEvaluation;
}

function resetForTests() {
  lastEvaluation = null;
}

module.exports = {
  setLastEvaluation,
  getLastEvaluation,
  resetForTests
};
