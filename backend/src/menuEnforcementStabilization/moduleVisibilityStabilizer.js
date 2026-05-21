'use strict';

const flags = require('../pilotMaturity/config/phaseZ4FeatureFlags');

const CORE = ['dashboard', 'settings', 'biblioteca', 'ai', 'help'];

function stabilizeModuleVisibility(modules = [], ctx = {}) {
  const list = Array.isArray(modules) ? [...modules] : [];
  const final = [...new Set([...CORE, ...list])];

  return {
    visible_modules: final,
    stabilized: flags.isMenuStabilityAnalysisEnabled(),
    recommendation_only: !flags.isMenuStabilityAnalysisEnabled(),
    auto_applied: false
  };
}

module.exports = { stabilizeModuleVisibility };
