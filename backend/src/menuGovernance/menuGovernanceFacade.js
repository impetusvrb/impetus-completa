'use strict';

const flags = require('../phaseZ0/config/phaseZ0FeatureFlags');
const { validateContextualMenuComposition } = require('./contextualMenuCompositionValidator');
const { analyzeSharedModuleLeakage } = require('./sharedModuleLeakageAnalyzer');

function getMenuGovernanceStatus(ctx = {}) {
  return {
    phase: 'Z.0',
    layer: 'menu-governance',
    analysis: flags.isMenuGovernanceAnalysisEnabled(),
    observability: flags.isRuntimeObservationObservabilityEnabled(),
    recommendation_only: true,
    auto_hide: false,
    tenant_id: ctx.tenant_id
  };
}

function analyzeMenuGovernance(ctx = {}) {
  const composition = validateContextualMenuComposition(ctx);
  const shared = analyzeSharedModuleLeakage(ctx);
  return {
    status: getMenuGovernanceStatus(ctx),
    composition,
    shared,
    targeting: {
      visible_modules: ctx.visible_modules,
      overdelivery: composition.delivery.overdelivery_modules,
      underdelivery: composition.delivery.underdelivery_modules
    },
    recommendation_only: true,
    auto_hide: false
  };
}

function getMenuGovernanceReport(ctx = {}) {
  return { ok: true, ...analyzeMenuGovernance(ctx) };
}

module.exports = {
  getMenuGovernanceStatus,
  analyzeMenuGovernance,
  getMenuGovernanceReport,
  validateContextualMenuComposition
};
