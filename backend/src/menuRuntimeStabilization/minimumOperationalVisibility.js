'use strict';

const { CLASSIFICATION } = require('../contextualEnforcement/moduleDeliveryClassification');

const TIER_MINIMUMS = {
  executive: ['dashboard', 'settings', 'biblioteca', 'ai'],
  management: ['dashboard', 'settings', 'operational', 'ai'],
  coordination: ['dashboard', 'settings', 'operational'],
  supervision: ['dashboard', 'settings', 'operational', 'proaction'],
  operational: ['dashboard', 'settings', 'operational', 'proaction']
};

function ensureMinimumOperationalVisibility(modules = [], ctx = {}) {
  const tier = ctx.canonical_identity?.hierarchy_tier || 'coordination';
  const minimum = TIER_MINIMUMS[tier] || TIER_MINIMUMS.coordination;
  const axis = ctx.canonical_identity?.domain_axis;

  let domainMin = [];
  if (axis === 'hr') domainMin = ['hr_intelligence'];
  if (axis === 'quality') domainMin = ['quality_intelligence'];
  if (axis === 'safety') domainMin = ['safety_intelligence'];

  const required = [...new Set([...minimum, ...domainMin])];
  const result = [...new Set([...required, ...modules])];

  return {
    visible_modules: result,
    minimum_required: required,
    underdelivery_prevented: modules.length < minimum.length,
    tier
  };
}

module.exports = { ensureMinimumOperationalVisibility, TIER_MINIMUMS };
