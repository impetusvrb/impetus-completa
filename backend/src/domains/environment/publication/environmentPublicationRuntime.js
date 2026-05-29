'use strict';

const navFlags = require('../navigation/environmentNavigationFlags');
const rollout = require('../activation/environmentActivationRolloutEngine');
const health = require('../activation/environmentPublicationHealthService');
const audienceResolver = require('./environmentAudienceResolver');
const capabilityResolver = require('./environmentCapabilityResolver');
const metrics = require('./environmentPublicationMetricsRuntime');
const audit = require('./environmentPublicationAuditRuntime');
const multiDomain = require('../../../enterprise-shadow-stabilization/multiDomainPublicationValidator');
const enterprisePilot = require('../../../enterprise-shadow-stabilization/tenantPilotReadinessEngine');

function environmentPublicationRuntime(user, opts = {}) {
  const t0 = Date.now();
  const flags = navFlags.snapshot();
  const companyId = opts.companyId || user?.company_id || null;
  const publicationAllowed =
    flags.operational && flags.navigation && flags.publication && !!companyId;
  const ctx = {
    ok: true,
    domain: 'environment',
    publication_allowed: publicationAllowed,
    denied_reason: publicationAllowed ? null : 'flags_or_tenant',
    rollout_shadow: flags.rollout_shadow,
    audience_preview: flags.audience_preview,
    flags,
    bounded_context: true,
    assistive_only: true
  };
  const band = audienceResolver.resolveEnvironmentAudienceBand(user);
  const capabilities = capabilityResolver.resolveEnvironmentCapabilities({
    hasEnvironmentIntelligenceModule: opts.hasEnvironmentIntelligenceModule !== false
  });
  const stage = rollout.resolveActivationStage();
  const healthPack = health.runSafeActivationChecks({
    tenantId: opts.companyId || user?.company_id,
    hasEnvironmentIntelligenceModule: opts.hasEnvironmentIntelligenceModule !== false
  });

  const multi = multiDomain.validateMultiDomainPublication();
  const pilot = enterprisePilot.evaluateTenantPilotReadiness(
    opts.companyId || user?.company_id,
    { domain: 'environment', health: healthPack }
  );

  const pack = {
    ...ctx,
    audience_band: band,
    audience_manifest_ids: audienceResolver.resolveAudienceManifestIds(band),
    capabilities,
    activation_stage: stage,
    health: healthPack,
    rollout_readiness_score: pilot?.readiness_score ?? (healthPack.readiness?.ready ? 0.85 : 0.4),
    cognitive_pressure_score: Math.min(1, (audienceResolver.resolveAudienceManifestIds(band).length || 1) / 12),
    publication_density_score: ctx.publication_allowed ? 0.7 : 0,
    sidebar_stability_score: multi.publication_stable ? 1 : 0.5,
    multi_domain_coexistence_score: multi.publication_stable ? 1 : 0.6,
    publication_runtime_ms: Date.now() - t0,
    shadow_only: navFlags.isShadowPublication(),
    auto_promotion: false,
    assistive_only: true
  };

  metrics.recordPublicationMetrics(pack);
  audit.recordEnvironmentPublicationAudit({
    actor: user?.id || null,
    band,
    publication_allowed: ctx.publication_allowed,
    stage
  });

  let policyGate = null;
  try {
    const pe = require('../../../../governance/domainPolicyEngine');
    const userRole = user?.role || user?.profile_code || user?.cargo || '';
    policyGate = pe.evaluate({
      domain: 'environment',
      action_type: 'publish',
      user_role: userRole,
      risk_level: 'high',
      runtime_mode: stage === 'full' ? 'on' : 'shadow',
      company_id: companyId
    });
    pack.policy_gate = policyGate;

    if (policyGate.mode === 'on' && policyGate.result === 'REQUIRE_APPROVAL' && !navFlags.isShadowPublication()) {
      pack.publication_blocked_by_policy = true;
      pack.publication_allowed = false;
      pack.denied_reason = 'policy_requires_approval';
    }
  } catch (_) {}

  return pack;
}

module.exports = { environmentPublicationRuntime };
