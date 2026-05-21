'use strict';

const flags = require('../runtimeGovernanceConsolidation/config/phaseZ10FeatureFlags');
const { analyzeGovernanceSustainability } = require('./governanceSustainabilityAnalyzer');
const { assessConvergenceSustainability } = require('./convergenceSustainability');
const { measureRuntimeOperationalPressure } = require('./runtimeOperationalPressure');

function runRuntimeSustainabilityEngine(tenantId, pack = {}, ctx = {}) {
  const governance = analyzeGovernanceSustainability(pack.maturity || {}, pack.stability || {});
  const convergence = assessConvergenceSustainability(ctx);
  const operational = measureRuntimeOperationalPressure(pack.stability || {}, governance);
  const scalability_ready = governance.sustainability_score >= 0.55 && convergence.preserved && !operational.high_pressure;

  return {
    phase: 'Z.10',
    tenant_id: tenantId,
    enabled: flags.isRuntimeSustainabilityEnabled(),
    sustainability_score: governance.sustainability_score,
    governance,
    convergence,
    operational,
    scalability_ready,
    recommendation_only: !flags.isRuntimeSustainabilityEnabled(),
    auto_expand: false,
    chat_enforcement: false
  };
}

module.exports = { runRuntimeSustainabilityEngine };
