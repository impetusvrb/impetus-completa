'use strict';

const shadow = require('../enterprise-shadow-stabilization/enterpriseShadowStabilizationOrchestrator');
const selector = require('./enterprisePilotTenantSelector');
const audience = require('./contextualAudienceReleaseRuntime');
const matrix = require('./audiencePilotMatrix');
const metrics = require('./enterprisePilotMetricsCollector');
const governance = require('./rolloutGovernanceRuntime');
const escalation = require('./rolloutEscalationProtection');

let obs;
try {
  obs = require('../services/operational/enterpriseObservabilityRuntime');
} catch {
  obs = { recordMetric: () => {} };
}

function buildExecutiveDashboard(pack) {
  const sp = pack.shadow_cycle || {};
  const m = pack.pilot_metrics || {};
  const g = pack.governance || {};
  const readiness = pack.tenant_selection?.selected?.[0]?.classification || {};
  const rolloutHealth = g.paused || g.frozen ? 40 : sp.multi_domain_publication?.publication_stable ? 78 : 55;
  return {
    adoption: m.adoption || { events: 0 },
    maturity: {
      cognitive: sp.cognitive_maturity?.cognitive_maturity_score,
      operational: sp.cognitive_maturity?.operational_maturity_score,
      readiness: sp.cognitive_maturity?.rollout_readiness_score
    },
    rollout_health_score: rolloutHealth,
    cognitive_pressure: sp.cognitive_maturity?.contextual_overload_score,
    publication_health: sp.multi_domain_publication?.publication_stable ? 'stable' : 'review',
    ux_health: sp.friction?.acceptable ? 'acceptable' : 'friction_detected',
    operational_readiness: readiness.level || 'LOW',
    pilot_wave: g.pilot_wave || 1
  };
}

function runPilotRolloutPreparation(reqBody = {}) {
  const tenantId = reqBody.tenant_id || null;
  const escalationCheck = escalation.assertNoEscalation({
    auto_promotion: reqBody.auto_promotion,
    governance_escalation: reqBody.governance_escalation,
    authority_escalation: reqBody.authority_escalation,
    target_stage: reqBody.target_stage
  });
  if (escalationCheck.blocked) {
    return { ok: false, blocked: true, violations: escalationCheck.violations, assistive_only: true };
  }

  const shadowCycle = shadow.runShadowStabilizationCycle({ ...reqBody, tenant_id: tenantId });
  const candidates = Array.isArray(reqBody.candidates)
    ? reqBody.candidates
    : tenantId
      ? [{ tenant_id: tenantId, shadow_pack: shadowCycle, operational_score: shadowCycle.tenant_pilot_readiness?.operational_score }]
      : [];

  const tenantSelection = selector.selectPilotTenants(candidates, { max_pilots: reqBody.max_pilots || 5 });
  const govState = governance.getGovernanceState(tenantId);
  const audienceMatrix = matrix.getAudiencePilotMatrix(tenantId, govState.pilot_wave);
  const audienceRelease = audience.evaluateAudienceRelease({
    tenant_id: tenantId,
    audience_band: reqBody.audience_band || 'operator',
    domain: reqBody.domain || 'quality',
    pilot_wave: govState.pilot_wave,
    audience_frozen: govState.audience_frozen
  });
  const pilotMetrics = metrics.summarizePilotMetrics(tenantId);

  const pack = {
    ok: true,
    framework: 'enterprise_pilot_rollout_preparation',
    domains: ['quality', 'safety', 'logistics', 'environment'],
    tenant_id: tenantId,
    generated_at: new Date().toISOString(),
    shadow_cycle: shadowCycle,
    tenant_selection: tenantSelection,
    governance: govState,
    audience_matrix: audienceMatrix,
    audience_release: audienceRelease,
    pilot_metrics: pilotMetrics,
    escalation_protection: escalationCheck,
    recommendation: { stage: 'pilot', auto_promotion: false, manual_only: true, full_rollout: false }
  };
  pack.dashboard = buildExecutiveDashboard(pack);
  try {
    obs.recordMetric('enterprise_pilot_rollout_health', pack.dashboard.rollout_health_score, {
      tenant: tenantId ? String(tenantId).slice(0, 8) : 'none'
    });
  } catch (_e) {
    /* noop */
  }
  return pack;
}

module.exports = {
  runPilotRolloutPreparation,
  recordPilotMetric: metrics.recordPilotMetric,
  governance
};
