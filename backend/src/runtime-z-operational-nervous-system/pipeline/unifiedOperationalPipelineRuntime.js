'use strict';

module.exports = {
  runUnifiedPipeline: (input) => require('./operationalPipelineOrchestrator').orchestrateOperationalPipeline(input),
  isEnabled: () => require('../config/sz4FeatureFlags').isPipelineEnabled()
};
