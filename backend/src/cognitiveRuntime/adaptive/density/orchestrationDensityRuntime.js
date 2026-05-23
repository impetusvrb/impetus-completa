'use strict';

const { suggestAdaptiveDensity } = require('./adaptiveDensityGovernor');
const { balanceContextualDensity } = require('./contextualDensityBalancer');

function runOrchestrationDensityRuntime(payload = {}, fatigue = {}) {
  const domain = payload.executive_cognitive_runtime?.consolidation_applied ? 'executive' : 'default';
  const suggestions = suggestAdaptiveDensity(payload, fatigue, domain);
  const balance = balanceContextualDensity(payload, suggestions.density_adjustment_suggested);
  return { ...suggestions, ...balance };
}

module.exports = { runOrchestrationDensityRuntime };
