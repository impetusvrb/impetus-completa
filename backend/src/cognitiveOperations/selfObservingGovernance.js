'use strict';

const { detectGovernanceDegradation } = require('./governanceDegradationDetector');
const { evaluateGovernanceSelf } = require('./governanceSelfEvaluation');

function observeGovernance(signals = {}) {
  const degradation = detectGovernanceDegradation(signals);
  const selfEval = evaluateGovernanceSelf(signals);
  return {
    self_observing: true,
    auto_adjust: false,
    degradation,
    self_evaluation: selfEval
  };
}

module.exports = { observeGovernance };
