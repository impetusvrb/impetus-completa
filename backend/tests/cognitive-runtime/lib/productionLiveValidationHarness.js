'use strict';

const crypto = require('crypto');

const EXECUTIVE_LEAK = /ebitda|faturamento|lucro|margem|turnover|absenteismo|apr\/pt|loto|resumo_executivo|boardroom|people_analytics/i;
const PRODUCTION_SEMANTIC = /oee|throughput|gargalo|scrap|downtime|parada|linha|turno|telemetria|eficiencia|manutenção/i;

const PROFILE_FIXTURES = [
  {
    id: 'coord_production',
    profile_code: 'coordinator_production',
    role: 'coordenador',
    functional_area: 'production',
    job_title: 'Coordenador de Produção',
    hierarchy_level: 3
  },
  {
    id: 'supervisor_production',
    profile_code: 'supervisor_production',
    role: 'supervisor',
    functional_area: 'production',
    job_title: 'Supervisor de Linha',
    hierarchy_level: 4
  },
  {
    id: 'manager_production',
    profile_code: 'manager_production',
    role: 'gerente',
    functional_area: 'production',
    job_title: 'Gerente de Produção',
    hierarchy_level: 2
  }
];

const MOCK_SIGNALS = {
  ok: true,
  telemetry_readiness: 'ready',
  loaded_at: new Date().toISOString(),
  operational: {
    oee_contextual: 78,
    throughput: 950,
    target_qty: 1000,
    efficiency_pct: 82,
    scrap_qty: 8,
    downtime_proxy: 1,
    lines_active: 3,
    monitored_total: 12,
    monitored_critical: 2,
    maintenance_open: 1,
    quality_nc_open: 0,
    primary_bottleneck_line: 'line_a',
    stability_index: 88,
    anomaly_risk: 'normal'
  },
  oee_context: {
    weighted_oee: 78.5,
    stability_index: 88,
    worst_line: 'line_b',
    line_contexts: [
      { line_identifier: 'line_a', efficiency_pct: 85 },
      { line_identifier: 'line_b', efficiency_pct: 62 }
    ]
  },
  bottlenecks: {
    primary_line: 'line_b',
    top_score: 38,
    heatmap: [{ line_identifier: 'line_b', bottleneck_score: 38 }],
    throughput_variance: { unstable: false }
  },
  telemetry: { telemetry_integrity: 'ok', stale_telemetry: false },
  raw: { lines: [{ line_identifier: 'line_a' }, { line_identifier: 'line_b' }], monitored: { total: 12, critical: 2 } }
};

const MOCK_SIGNALS_STALE = {
  ...MOCK_SIGNALS,
  telemetry_readiness: 'degraded',
  signal_degradation: 'stale_shift_data',
  telemetry: { telemetry_integrity: 'stale', stale_telemetry: true }
};

const MOCK_SIGNALS_EMPTY = {
  ok: true,
  telemetry_readiness: 'empty',
  operational: { lines_active: 0, throughput: 0 },
  oee_context: { weighted_oee: null, line_contexts: [] },
  bottlenecks: { primary_line: null, top_score: 0 },
  raw: { monitored: { total: 0, critical: 0 } }
};

function stableHash(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
}

function buildBasePayload(user, config) {
  return {
    profile_code: config.profile_code,
    profile_config: config.profile_config,
    functional_area: config.functional_area,
    functional_axis: config.functional_axis || config.functional_area,
    governance_freeze_state: { governance_locked: false },
    terminal_governance: { applied: true }
  };
}

async function runProfilePipeline(user, opts = {}) {
  const dashboardProfileResolver = require('../../../src/services/dashboardProfileResolver');
  const facade = require('../../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');

  const config = dashboardProfileResolver.getDashboardConfigForUser({
    ...user,
    company_id: user.company_id || 'zp1_live_tenant',
    id: user.id || 'u1'
  });

  let payload = buildBasePayload(user, config);
  payload.profile_code = config.profile_code;
  payload.profile_config = config.profile_config;

  const cog = await facade.applyCognitiveFoundationToDashboard(
    { ...user, company_id: user.company_id || 'zp1_live_tenant' },
    payload,
    {
      force_cognitive_observability: true,
      force_composition: true,
      force_production_consolidation: opts.force_consolidation === true,
      zp0_render_promoted: true,
      mock_signals: opts.mock_signals || MOCK_SIGNALS,
      profile_code: config.profile_code
    }
  );

  return { config, payload: cog.payload, report: cog.cognitive_runtime_report };
}

function analyzeProductionPayload(payload = {}) {
  const prod = payload.production_cognitive_runtime || {};
  const lv = payload.production_live_validation || {};
  const th = payload.telemetry_health || {};
  const centers = payload.production_cognitive_centers || [];
  const widgets = (payload.widgets_promoted || []).filter((w) => !w.collapsed_generic);
  const blob = JSON.stringify({ prod, centers, widgets, lv, th, summary: payload.specialized_summary });

  return {
    cockpit_mode: prod.cockpit_mode,
    consolidation_applied: prod.consolidation_applied === true,
    center_count: centers.length,
    widget_count: widgets.length,
    telemetry_ready: lv.telemetry_ready ?? th.ready,
    stale_detected: th.stale_detected === true,
    trust_score: th.trust_score,
    density_safe: lv.density_safe,
    overload_detected: lv.overload_detected,
    cross_domain_clean: lv.cross_domain_clean,
    industrial_usefulness: lv.industrial_usefulness,
    production_semantic_hits: (blob.match(new RegExp(PRODUCTION_SEMANTIC.source, 'gi')) || []).length,
    executive_leak: EXECUTIVE_LEAK.test(blob),
    live_validation: lv
  };
}

module.exports = {
  PROFILE_FIXTURES,
  MOCK_SIGNALS,
  MOCK_SIGNALS_STALE,
  MOCK_SIGNALS_EMPTY,
  stableHash,
  runProfilePipeline,
  analyzeProductionPayload,
  EXECUTIVE_LEAK,
  PRODUCTION_SEMANTIC
};
