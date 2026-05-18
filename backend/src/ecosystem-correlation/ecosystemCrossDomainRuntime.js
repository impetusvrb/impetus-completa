'use strict';

const quality = require('./domains/environmentQualityCorrelationEngine');
const safety = require('./domains/environmentSafetyCorrelationEngine');
const logistics = require('./domains/environmentLogisticsCorrelationEngine');
const production = require('./domains/environmentProductionCorrelationEngine');
const maintenance = require('./domains/environmentMaintenanceCorrelationEngine');
const envCross = require('../domains/environment/analytics/environmentCrossDomainCorrelationRuntime');

function ecosystemCrossDomainRuntime(ctx = {}) {
  const input = ctx.signals || ctx;
  const pairs = {
    quality: quality.environmentQualityCorrelationEngine(input.quality || input),
    safety: safety.environmentSafetyCorrelationEngine(input.safety || input),
    logistics: logistics.environmentLogisticsCorrelationEngine(input.logistics || input),
    production: production.environmentProductionCorrelationEngine(input.production || input),
    maintenance: maintenance.environmentMaintenanceCorrelationEngine(input.maintenance || input)
  };
  const legacy = envCross.environmentalCrossDomainCorrelationRuntime(input);
  const scores = Object.values(pairs).map((p) => p.aggregate_score || 0);
  const density = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return {
    ok: true,
    domain_pairs: pairs,
    legacy_environment_correlation: legacy,
    linked_domains: legacy.linked_domains,
    ecosystem_cross_domain_density_score: density,
    bounded_context_safe: true,
    assistive_only: true
  };
}

module.exports = { ecosystemCrossDomainRuntime };
