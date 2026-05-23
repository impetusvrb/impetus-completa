'use strict';

const crypto = require('crypto');

const EXECUTIVE_LEAK = /ebitda|faturamento|lucro|margem|boardroom executivo|resumo executivo corporativo/i;
const DENIED_CROSS = /oee|throughput turno|turnover|absenteismo|apr\/pt|loto/i;
const ENV_SEMANTIC = /emiss|resíduo|licen|compliance|esg|auditoria|conformidade|sustentabilidade/i;

const PROFILE_FIXTURES = [
  {
    id: 'coord_env',
    profile_code: 'coordinator_environmental',
    role: 'coordenador',
    functional_area: 'environmental',
    job_title: 'Coordenador Ambiental',
    hierarchy_level: 3
  },
  {
    id: 'mgr_env',
    profile_code: 'manager_environmental',
    role: 'gerente',
    functional_area: 'environmental',
    job_title: 'Gerente Ambiental',
    hierarchy_level: 2
  }
];

const MOCK_SIGNALS = {
  ok: true,
  telemetry_readiness: 'ready',
  loaded_at: new Date().toISOString(),
  operational: {
    emissions_tco2e: 120,
    waste_tonnes: 8,
    water_m3: 400,
    energy_mwh: 22,
    esg_score: 74,
    licenses_total: 3,
    licenses_expiring: 1,
    regulatory_alerts: 0,
    audit_open: 0,
    incidents_open: 0,
    compliance_risk_score: 25,
    sustainability_maturity: 68
  },
  telemetry: { telemetry_integrity: 'ok', stale_telemetry: false, sensor_coverage: 0.65 },
  raw: {
    licenses: [
      { id: '1', name: 'Licença Operação', days_to_expire: 45 },
      { id: '2', name: 'Outorga Água', days_to_expire: 120 }
    ],
    incidents: 0
  }
};

const MOCK_SIGNALS_STALE = {
  ...MOCK_SIGNALS,
  telemetry_readiness: 'degraded',
  signal_degradation: 'stale_environmental',
  telemetry: { telemetry_integrity: 'stale', stale_telemetry: true, sensor_coverage: 0.2 }
};

const MOCK_SIGNALS_EMPTY = {
  ok: true,
  telemetry_readiness: 'empty',
  operational: { licenses_total: 0, regulatory_alerts: 0 },
  telemetry: {},
  raw: { licenses: [] }
};

const MOCK_SIGNALS_EXPIRED = {
  ...MOCK_SIGNALS,
  operational: { ...MOCK_SIGNALS.operational, licenses_expiring: 2, compliance_risk_score: 75 },
  raw: {
    licenses: [{ id: 'x', name: 'Lic Vencida', days_to_expire: -5 }],
    incidents: 1
  }
};

function stableHash(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
}

function buildBasePayload(user, config) {
  return {
    profile_code: config.profile_code,
    profile_config: config.profile_config,
    functional_area: config.functional_area || 'environmental',
    functional_axis: config.functional_axis || 'environmental',
    governance_freeze_state: { governance_locked: false },
    terminal_governance: { applied: true }
  };
}

async function runProfilePipeline(user, opts = {}) {
  const dashboardProfileResolver = require('../../../src/services/dashboardProfileResolver');
  const facade = require('../../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');

  const config = dashboardProfileResolver.getDashboardConfigForUser({
    ...user,
    company_id: user.company_id || 'p1env_live_tenant',
    id: user.id || 'u1'
  });

  let payload = buildBasePayload(user, config);
  payload.profile_code = config.profile_code;
  payload.profile_config = config.profile_config;

  const cog = await facade.applyCognitiveFoundationToDashboard(
    { ...user, company_id: user.company_id || 'p1env_live_tenant' },
    payload,
    {
      force_composition: true,
      force_environmental_consolidation: true,
      p1env_render_promoted: true,
      mock_signals: opts.mock_signals || MOCK_SIGNALS,
      force_environmental_live_validation: opts.force_live_validation !== false
    }
  );

  return { payload: cog.payload, config };
}

function analyzeEnvironmentalPayload(payload = {}) {
  const blob = JSON.stringify(payload);
  const rt = payload.environmental_cognitive_runtime || {};
  const lv = payload.environmental_live_validation || {};
  const centers = payload.environmental_cognitive_centers || rt.centers || [];
  const widgets = (payload.widgets_promoted || []).filter((w) => w.render_promoted !== false);

  return {
    cockpit_mode: rt.cockpit_mode,
    consolidation_applied: rt.consolidation_applied,
    center_count: centers.length,
    widget_count: widgets.length,
    executive_leak: EXECUTIVE_LEAK.test(blob),
    cross_domain_leak: DENIED_CROSS.test(blob),
    env_semantic_hits: ENV_SEMANTIC.test(blob) ? 1 : 0,
    live_validation: lv,
    telemetry_health: payload.environmental_telemetry_health
  };
}

module.exports = {
  PROFILE_FIXTURES,
  MOCK_SIGNALS,
  MOCK_SIGNALS_STALE,
  MOCK_SIGNALS_EMPTY,
  MOCK_SIGNALS_EXPIRED,
  stableHash,
  runProfilePipeline,
  analyzeEnvironmentalPayload
};
