'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (['on', 'shadow', 'controlled', 'active'].includes(v)) return v;
  return 'off';
}

module.exports = {
  governanceLearningMode: () => _mode('IMPETUS_GOVERNANCE_LEARNING', 'off'),
  isGovernanceLearningEnabled: () => {
    const m = _mode('IMPETUS_GOVERNANCE_LEARNING', 'off');
    return m === 'shadow' || m === 'on' || m === 'active' || m === 'controlled';
  },
  isGovernanceLearningShadow: () => _mode('IMPETUS_GOVERNANCE_LEARNING', 'off') === 'shadow',
  isPatternLearningEnabled: () => _flag('IMPETUS_PATTERN_LEARNING', true),
  isUsefulnessLearningEnabled: () => _flag('IMPETUS_USEFULNESS_LEARNING', true),
  isConvergenceLearningEnabled: () => _flag('IMPETUS_CONVERGENCE_LEARNING', true),
  isLearningObservabilityEnabled: () => _flag('IMPETUS_LEARNING_OBSERVABILITY', true),
  autoMutationAllowed: false,
  autoDecision: false,
  autoRemediation: false
};
