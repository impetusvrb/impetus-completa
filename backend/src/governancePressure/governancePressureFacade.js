'use strict';

const flags = require('../runtimeGovernanceConsolidation/config/phaseZ10FeatureFlags');
const { analyzeGovernancePressure } = require('./governancePressureAnalyzer');
const { assessRuntimeGovernanceFatigue } = require('./runtimeGovernanceFatigue');
const { measureTenantObservabilityPressure } = require('./tenantObservabilityPressure');
const { measureOperationalGovernanceLoad } = require('./operationalGovernanceLoad');

function assessGovernancePressure(tenantId, stabilityPack = {}, ctx = {}) {
  const pressure = analyzeGovernancePressure(stabilityPack, ctx);
  const fatigue = assessRuntimeGovernanceFatigue(stabilityPack);
  const observability = measureTenantObservabilityPressure(ctx);
  const load = measureOperationalGovernanceLoad(pressure, observability);

  return {
    phase: 'Z.10',
    tenant_id: tenantId,
    enabled: flags.isGovernancePressureAnalysisEnabled(),
    pressure,
    fatigue,
    observability,
    load,
    governance_fatigue_detected: fatigue.fatigued || load.overload,
    recommendation_only: true,
    auto_remediate: false
  };
}

module.exports = { assessGovernancePressure };
