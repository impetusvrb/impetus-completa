'use strict';

const { resolveWidgets } = require('./governedWidgetExposureResolver');
const { recordCardAlignment } = require('../runtimeAlignment/semanticRuntimeTelemetry');

function composeCards(widgets, ctx = {}) {
  const result = resolveWidgets(widgets, ctx);
  recordCardAlignment(result.alignment_score);
  return {
    ...result,
    composition: 'governed_card_orchestration',
    enforcement: require('../semanticGovernance/config/phaseKFeatureFlags').isGovernedCardOrchestrationEnabled()
  };
}

module.exports = { composeCards };
