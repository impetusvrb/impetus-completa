'use strict';

const flags = require('../../config/phaseZ28FeatureFlags');

function coordinateOrchestrationRuntime(report = {}) {
  return {
    phase: 'Z.28',
    mode: flags.adaptiveOrchestrationMode(),
    supervised: true,
    auto_mutation: false,
  auto_remediation: flags.autoRemediation,
    ...report
  };
}

module.exports = { coordinateOrchestrationRuntime };
