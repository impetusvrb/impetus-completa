'use strict';

const { ENVIRONMENTAL_BLOCK_ALIASES } = require('../../../registry/environmentalCognitiveBlockPack');
const { buildEnvironmentalOperationalAI } = require('./environmentalOperationalAI');
const { buildEnvironmentalNarrative } = require('./environmentalNarrativeEngine');
const { runEnvironmentalGovernanceRuntime } = require('../governance/environmentalGovernanceRuntime');

const BINDERS = {
  'environmental.emissions_monitor': bindEmissions,
  'environmental.esg_governance': bindEsg,
  'environmental.waste_management': bindWaste,
  'environmental.license_compliance': bindLicense,
  'environmental.regulatory_risk': bindRisk,
  'environmental.sustainability_metrics': bindSustainability,
  'environmental.environmental_telemetry': bindTelemetry,
  'environmental.resource_efficiency': bindResources,
  'environmental.environmental_audit': bindAudit,
  'environmental.environmental_incidents': bindIncidents,
  'environmental.compliance_timeline': bindTimeline,
  'environmental.environmental_narrative': bindNarrative,
  'environmental.contextual_environmental_ai': bindAi,
  'environmental.environmental_heatmap': bindHeatmap,
  'environmental.carbon_tracking': bindCarbon,
  'environmental.environmental_alerts': bindAlerts
};

function invokeEnvironmentalBlockBridge(blockId, signalBundle = {}, ctx = {}) {
  const canonical = ENVIRONMENTAL_BLOCK_ALIASES[blockId] || blockId;
  const fn = BINDERS[canonical] || BINDERS[blockId];
  if (!fn) return { ok: false, block_id: blockId, bridge_status: 'unbound_p1env', reason: 'unknown_block' };
  const out = fn(signalBundle, ctx);
  return { ...out, block_id: canonical, bridge_status: out.ok ? 'bound_p1env' : 'bound_empty' };
}

function buildEnvironmentalEngineContext(signalBundle = {}, bindings = []) {
  const governance = runEnvironmentalGovernanceRuntime(signalBundle);
  const ai = buildEnvironmentalOperationalAI(signalBundle);
  const narrative = buildEnvironmentalNarrative(signalBundle, governance);
  return { governance, ai, narrative, findings: bindings.map((b) => b.summary).filter(Boolean) };
}

function bindEmissions(s) {
  const op = s.operational || {};
  return {
    ok: op.emissions_tco2e != null || s.telemetry_readiness === 'empty',
    metrics: { tco2e: op.emissions_tco2e },
    summary: op.emissions_tco2e != null ? `Emissões ${op.emissions_tco2e} tCO2e` : 'Emissões — aguardar medição',
    engine_ref: 'environmental.emissions'
  };
}

function bindEsg(s) {
  const op = s.operational || {};
  return { ok: true, metrics: { esg_score: op.esg_score }, summary: `ESG contextual ${op.esg_score ?? '—'}`, engine_ref: 'environmental.esg' };
}

function bindWaste(s) {
  const op = s.operational || {};
  return { ok: true, metrics: { waste_tonnes: op.waste_tonnes }, summary: `Resíduos ${op.waste_tonnes ?? 0} t`, engine_ref: 'environmental.waste' };
}

function bindLicense(s) {
  const op = s.operational || {};
  return {
    ok: true,
    metrics: { total: op.licenses_total, expiring: op.licenses_expiring },
    summary: `Licenças: ${op.licenses_total ?? 0}, ${op.licenses_expiring ?? 0} a vencer`,
    engine_ref: 'environmental.licenses'
  };
}

function bindRisk(s) {
  const op = s.operational || {};
  return {
    ok: true,
    metrics: { risk_score: op.compliance_risk_score },
    summary: `Risco regulatório ${op.compliance_risk_score ?? 0}`,
    engine_ref: 'environmental.regulatory_risk'
  };
}

function bindSustainability(s) {
  const op = s.operational || {};
  return {
    ok: true,
    metrics: { maturity: op.sustainability_maturity },
    summary: `Maturidade sustentabilidade ${op.sustainability_maturity ?? '—'}`,
    engine_ref: 'environmental.sustainability'
  };
}

function bindTelemetry(s) {
  return {
    ok: s.telemetry_readiness !== 'error',
    metrics: { readiness: s.telemetry_readiness },
    summary: `Telemetria ambiental ${s.telemetry_readiness}`,
    engine_ref: 'environmental.telemetry'
  };
}

function bindResources(s) {
  const op = s.operational || {};
  return {
    ok: true,
    metrics: { water: op.water_proxy, energy: op.energy_proxy },
    summary: 'Recursos água/energia — feed dedicado pendente',
    engine_ref: 'environmental.resources'
  };
}

function bindAudit(s) {
  const op = s.operational || {};
  return { ok: true, metrics: { audit_open: op.audit_open }, summary: `Auditorias abertas ${op.audit_open ?? 0}`, engine_ref: 'environmental.audit' };
}

function bindIncidents(s) {
  const op = s.operational || {};
  return { ok: true, metrics: { incidents: op.incidents_open }, summary: `Incidentes ambientais ${op.incidents_open ?? 0}`, engine_ref: 'environmental.incidents' };
}

function bindTimeline(s) {
  const op = s.operational || {};
  return { ok: true, metrics: { expiring: op.licenses_expiring }, summary: `Vencimentos ${op.licenses_expiring ?? 0}`, engine_ref: 'environmental.timeline' };
}

function bindNarrative(s, ctx, bindings) {
  const n = buildEnvironmentalNarrative(s);
  return { ok: true, metrics: {}, summary: n.paragraphs[0], narrative: n, engine_ref: 'environmental.narrative' };
}

function bindAi(s) {
  const ai = buildEnvironmentalOperationalAI(s);
  return { ok: true, metrics: { answers: ai.answers.length }, summary: ai.answers[0]?.a || 'IA ambiental', ai, engine_ref: 'environmental.ai' };
}

function bindHeatmap(s) {
  return { ok: true, metrics: { risk: s.operational?.compliance_risk_score }, summary: 'Mapa risco ambiental', engine_ref: 'environmental.heatmap' };
}

function bindCarbon(s) {
  const op = s.operational || {};
  return { ok: true, metrics: { carbon: op.emissions_tco2e }, summary: `Carbono ${op.emissions_tco2e ?? '—'} tCO2e`, engine_ref: 'environmental.carbon' };
}

function bindAlerts(s) {
  const op = s.operational || {};
  return { ok: true, metrics: { alerts: op.regulatory_alerts }, summary: `${op.regulatory_alerts ?? 0} alertas compliance`, engine_ref: 'environmental.alerts' };
}

module.exports = { invokeEnvironmentalBlockBridge, buildEnvironmentalEngineContext };
