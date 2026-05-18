'use strict';

const flags = require('../flags/environmentExecutiveRuntimeFlags');
const obs = require('../shared/environmentExecutiveObservability');
const { buildExecutiveExplainability } = require('../shared/environmentExecutiveExplainability');
const carbonGov = require('../../governance/carbon/environmentCarbonRuntime');
const EXEC = require('../events/executiveEventHints');

function environmentCarbonAnalyticsEngine(input = {}) {
  let base = carbonGov.environmentCarbonRuntime(input);
  if (base.skipped) {
    const s1 = Number(input.scope1_tco2e) || 10;
    const s2 = Number(input.scope2_tco2e) || 20;
    const s3 = Number(input.scope3_tco2e) || 5;
    const total = s1 + s2 + s3;
    base = {
      ok: true,
      inventory: { scope1_tco2e: s1, scope2_tco2e: s2, scope3_tco2e: s3, total_tco2e: total },
      intensity: { intensity_per_unit: total / (Number(input.production_units) || 1) },
      executive_standalone: true
    };
  }
  const inv = base.inventory || {};
  return {
    scopes: { scope1: inv.scope1_tco2e, scope2: inv.scope2_tco2e, scope3: inv.scope3_tco2e },
    total_tco2e: inv.total_tco2e,
    intensity: base.intensity?.intensity_per_unit,
    production_correlation: input.production_units ? 'production_linked' : 'unknown',
    logistics_correlation: input.logistics_tco2e != null ? 'logistics_linked' : 'unknown',
    trend: input.emission_trend || 'stable'
  };
}

function environmentCarbonHeatmapRuntime(analytics) {
  const cells = [
    { id: 'scope1', value: analytics.scopes?.scope1 || 0, label: 'Escopo 1' },
    { id: 'scope2', value: analytics.scopes?.scope2 || 0, label: 'Escopo 2' },
    { id: 'scope3', value: analytics.scopes?.scope3 || 0, label: 'Escopo 3' }
  ];
  const max = Math.max(...cells.map((c) => c.value), 1);
  return {
    cells: cells.map((c) => ({ ...c, intensity: c.value / max })),
    hotspots: cells.filter((c) => c.value / max > 0.55).map((c) => c.id)
  };
}

function environmentCarbonNarrativeRuntime(analytics, heatmap) {
  return {
    headline: `Carbono — ${analytics.total_tco2e?.toFixed(1) || 0} tCO₂e`,
    hotspots: heatmap.hotspots,
    assistive_only: true
  };
}

function environmentCarbonRiskRuntime(analytics) {
  const total = analytics.total_tco2e || 0;
  const limit = Number(analytics.limit) || 1000;
  const ratio = total / limit;
  return {
    risk_score: Math.min(1, ratio),
    severity: ratio > 0.85 ? 'high' : ratio > 0.6 ? 'medium' : 'low',
    emit_hotspot: (heatmap) => heatmap.hotspots?.length > 0
  };
}

function environmentCarbonExecutiveRuntime(input = {}) {
  if (!flags.isEnvironmentExecutiveCarbonAnalyticsEnabled()) {
    return { skipped: true, code: 'CARBON_OFF' };
  }
  return obs.withTiming(
    'environment_executive_carbon_runtime_ms',
    () => {
      const analytics = environmentCarbonAnalyticsEngine(input);
      if (analytics.skipped) return analytics;
      const heatmap = environmentCarbonHeatmapRuntime(analytics);
      const risk = environmentCarbonRiskRuntime(analytics, input);
      const narrative = environmentCarbonNarrativeRuntime(analytics, heatmap);
      const hotspot_detected = heatmap.hotspots?.length > 0;
      return {
        ok: true,
        cockpit: 'carbon',
        analytics,
        heatmap,
        risk,
        narrative,
        hotspot_detected,
        event_hint: hotspot_detected ? EXEC.CARBON_HOTSPOT_DETECTED : null,
        explainability: buildExecutiveExplainability({
          rationale: 'Analytics de carbono escopos 1-3 com correlação produção/logística.',
          evidence: heatmap.hotspots,
          impact: `intensity ${analytics.intensity}`
        })
      };
    },
    { module: 'carbon' }
  );
}

module.exports = {
  environmentCarbonExecutiveRuntime,
  environmentCarbonAnalyticsEngine,
  environmentCarbonHeatmapRuntime,
  environmentCarbonNarrativeRuntime,
  environmentCarbonRiskRuntime
};
