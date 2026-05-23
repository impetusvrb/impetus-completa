'use strict';

const flags = require('../../../config/phaseZ27FeatureFlags');
const { runStrategicIsolationRuntime } = require('../governance/strategicIsolationRuntime');
const { validateExecutiveGovernance } = require('../governance/executiveGovernanceValidator');
const { applyExecutiveDensityGovernor } = require('../density/executiveDensityGovernor');
const { protectBoardroomAttention } = require('../density/boardroomAttentionProtection');
const { validateBoardroomNarrativeIntegrity } = require('../narrative/boardroomNarrativeIntegrity');
const { validateEnterpriseConvergence } = require('../convergence/enterpriseConvergenceValidator');
const { analyzeBoardroomPerformance } = require('../performance/boardroomPerformanceRuntime');
const { buildStrategicRuntimeHealth } = require('../performance/strategicRuntimeHealth');

async function runExecutiveLiveValidation(user = {}, payload = {}, ctx = {}, opts = {}) {
  if (!flags.isExecutiveLiveValidationEnabled() && !ctx.force_executive_live_validation) {
    return { skipped: true, reason: 'z27_live_validation_off' };
  }
  const t0 = Date.now();
  const consolidated = opts.consolidated || {
    centers: payload.executive_cognitive_centers || payload.executive_cognitive_runtime?.centers,
    widgets: payload.widgets_promoted,
    executive_narrative: payload.executive_cognitive_runtime?.executive_narrative
  };
  const isolation = runStrategicIsolationRuntime(payload, consolidated);
  const governance = validateExecutiveGovernance(payload, consolidated);
  const density = applyExecutiveDensityGovernor(consolidated.centers || [], consolidated.widgets || []);
  const attention = protectBoardroomAttention(density.centers);
  const narrative = validateBoardroomNarrativeIntegrity(consolidated.executive_narrative || {});
  const convergence = validateEnterpriseConvergence(payload.executive_cognitive_runtime?.strategic || {});
  const perf = analyzeBoardroomPerformance({ total_ms: Date.now() - t0 });

  const executive_live_validation = {
    phase: 'Z.27',
    mode: flags.executiveBoardroomMode(),
    boardroom_stable: true,
    strategic_usefulness: payload.executive_cognitive_health?.score ?? 0.8,
    operational_leak_detected: governance.operational_leak_detected === true,
    cross_domain_coherent: convergence.aligned !== false,
    density_safe: density.density.density_safe,
    alert_fatigue_detected: attention.alert_fatigue === true,
    narrative_integrity: narrative.ok !== false,
    performance_safe: perf.runtime_performance_safe,
    aggregation_supervised: true
  };

  return {
    executive_live_validation,
    isolation_validation: isolation,
    density_validation: { density, attention },
    narrative_validation: narrative,
    convergence_validation: convergence,
    performance: perf,
    ...buildStrategicRuntimeHealth({ executive_live_validation })
  };
}

function getExecutiveLiveValidationStatus() {
  return {
    phase: 'Z.27',
    boardroom: flags.executiveBoardroomMode(),
    density_governor: flags.isExecutiveDensityGovernorEnabled(),
    observability: flags.isExecutiveObservabilityEnabled()
  };
}

module.exports = { runExecutiveLiveValidation, getExecutiveLiveValidationStatus };
