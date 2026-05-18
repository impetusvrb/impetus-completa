'use strict';

const navFlags = require('../navigation/environmentNavigationFlags');
const health = require('./environmentPublicationHealthService');
const rollout = require('./environmentActivationRolloutEngine');
const { environmentPublicationValidationRuntime } = require('../publication');
const multi = require('../../../enterprise-shadow-stabilization/multiDomainPublicationValidator');
const enterprise = require('../../../runtime-validation/enterpriseRuntimeValidationEngine');
const audience = require('../publication/environmentAudienceResolver');
const density = require('./environmentShadowDensityValidation');

function environmentShadowReadinessRuntime(ctx = {}) {
  const flags = navFlags.snapshot();
  const checks = health.runSafeActivationChecks({
    tenantId: ctx.tenant_id || 'preflight-tenant',
    hasEnvironmentIntelligenceModule: ctx.has_environment_intelligence !== false
  });
  const stage = rollout.resolveActivationStage();
  const ready =
    flags.navigation &&
    flags.publication &&
    flags.operational &&
    flags.rollout_shadow &&
    checks.readiness?.ready !== false;
  return {
    ready,
    activation_stage: stage,
    definitive_publication: rollout.allowsDefinitivePublication(stage),
    flags,
    health: checks,
    shadow_only: true,
    auto_promotion: false
  };
}

function environmentShadowPublicationValidation() {
  const v = environmentPublicationValidationRuntime({
    user: { company_id: '00000000-0000-4000-8000-000000000001', role: 'coordenador' },
    tenant_id: '00000000-0000-4000-8000-000000000001'
  });
  return {
    ok: v.ok && v.shadow_only === true,
    publication_allowed: v.publication?.publication_allowed,
    pipeline: v.multi_domain?.pipeline_order,
    issues: v.issues || []
  };
}

function environmentShadowAudienceValidation() {
  const samples = [
    { resolved_band: 'operator', visible_menu_count: 5, module_licensed: true, should_publish_menu: true, publication_runtime_on: true },
    { resolved_band: 'technician', visible_menu_count: 6, module_licensed: true, should_publish_menu: true, publication_runtime_on: true },
    { resolved_band: 'coordinator', visible_menu_count: 8, module_licensed: true, should_publish_menu: true, publication_runtime_on: true },
    { resolved_band: 'director', visible_menu_count: 7, module_licensed: true, should_publish_menu: true, publication_runtime_on: true }
  ];
  const bands = {
    operator: audience.resolveAudienceManifestIds('operator'),
    technician: audience.resolveAudienceManifestIds('technician'),
    coordinator: audience.resolveAudienceManifestIds('coordinator'),
    director: audience.resolveAudienceManifestIds('director')
  };
  const enterpriseAudience = require('../../../runtime-validation/enterpriseAudienceValidationRuntime');
  const matrix = enterpriseAudience.validateAudienceMatrix(samples);
  return {
    ok: matrix.failure_count === 0,
    bands,
    matrix
  };
}

function environmentShadowSidebarValidation() {
  const md = multi.validateMultiDomainPublication();
  return {
    ok: md.publication_stable && md.pipeline_order.includes('environment'),
    pipeline_order: md.pipeline_order,
    core_preserved: md.domains?.dashboard?.preserved && md.domains?.ia_chat?.preserved
  };
}

function environmentShadowOperationalValidation() {
  const opFlags = require('../operational/environmentOperationalRuntimeFlags');
  const govFlags = require('../governance/environmentGovernanceRuntimeFlags');
  const telFlags = require('../telemetry/environmentTelemetryRuntimeFlags');
  const cogFlags = require('../cognitive/flags/environmentCognitiveRuntimeFlags');
  const execFlags = require('../executive/flags/environmentExecutiveRuntimeFlags');
  return {
    ok: opFlags.isEnvironmentOperationalRuntimeEnabled(),
    operational: opFlags.getOperationalRuntimeFlagSnapshot(),
    governance: govFlags.getGovernanceRuntimeFlagSnapshot?.() || { enabled: govFlags.isEnvironmentGovernanceRuntimeEnabled() },
    telemetry: telFlags.getTelemetryRuntimeFlagSnapshot?.() || {},
    cognitive: cogFlags.getCognitiveRuntimeFlagSnapshot?.() || {},
    executive: execFlags.getExecutiveRuntimeFlagSnapshot?.() || {}
  };
}

function environmentShadowCognitiveValidation() {
  return density.runEnvironmentShadowDensityValidationPack();
}

function environmentShadowCoexistenceValidation() {
  const snap = enterprise.validateEnterpriseRuntime();
  return {
    ok: snap.stable && snap.legacy_coexistence && snap.fallback_navigation_preserved,
    conflicts: snap.conflicts,
    bounded_contexts: snap.bounded_contexts
  };
}

function runEnvironmentShadowPreflight(ctx = {}) {
  const publication = environmentShadowPublicationValidation();
  const audienceVal = environmentShadowAudienceValidation();
  const sidebar = environmentShadowSidebarValidation();
  const operational = environmentShadowOperationalValidation();
  const cognitive = environmentShadowCognitiveValidation();
  const coexistence = environmentShadowCoexistenceValidation();
  const readiness = environmentShadowReadinessRuntime(ctx);

  const checks = [
    { id: 'readiness', ok: readiness.ready || readiness.flags?.rollout_shadow },
    { id: 'publication', ok: publication.ok !== false },
    { id: 'audience', ok: audienceVal.ok },
    { id: 'sidebar', ok: sidebar.ok },
    { id: 'operational', ok: operational.ok },
    { id: 'cognitive', ok: cognitive.ok },
    { id: 'coexistence', ok: coexistence.ok }
  ];

  const go = checks.every((c) => c.ok);
  return {
    framework: 'environment_shadow_preflight',
    go,
    decision: go ? 'GO_SHADOW_ACTIVATION' : 'NO_GO',
    checks,
    readiness,
    publication,
    audience: audienceVal,
    sidebar,
    operational,
    cognitive,
    coexistence,
    shadow_only: true,
    auto_promotion: false
  };
}

module.exports = {
  environmentShadowReadinessRuntime,
  environmentShadowPublicationValidation,
  environmentShadowAudienceValidation,
  environmentShadowSidebarValidation,
  environmentShadowOperationalValidation,
  environmentShadowCognitiveValidation,
  environmentShadowCoexistenceValidation,
  runEnvironmentShadowPreflight
};
