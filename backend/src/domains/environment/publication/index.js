'use strict';

const runtime = require('./environmentPublicationRuntime');
const validation = require('./environmentPublicationValidationRuntime');
const audience = require('./environmentAudienceResolver');
const capabilities = require('./environmentCapabilityResolver');
const metrics = require('./environmentPublicationMetricsRuntime');
const audit = require('./environmentPublicationAuditRuntime');

function environmentAudienceRuntime(samples) {
  const enterpriseAudience = require('../../../runtime-validation/enterpriseAudienceValidationRuntime');
  return enterpriseAudience.validateAudienceMatrix(samples || []);
}

function environmentAudienceValidationRuntime(ctx) {
  return environmentAudienceRuntime(ctx.samples);
}

function environmentAudienceContextRuntime(user) {
  const band = audience.resolveEnvironmentAudienceBand(user);
  return {
    band,
    manifest_ids: audience.resolveAudienceManifestIds(band),
    density: band === 'director' || band === 'manager' ? 'executive' : 'operational'
  };
}

function environmentOperationalDensityRuntime(band) {
  const ids = audience.resolveAudienceManifestIds(band || 'operator');
  return { band: band || 'operator', menu_density: ids.length, cognitive_safe: ids.length <= 8 };
}

function environmentExecutiveDensityRuntime(band) {
  const executive = ['director', 'manager'].includes(band);
  return { executive, max_items: executive ? 8 : 4 };
}

function environmentCognitivePressureRuntime(ctx = {}) {
  const count = Number(ctx.visible_menu_count) || audience.resolveAudienceManifestIds(ctx.band || 'production').length;
  const score = Math.min(1, count / 14);
  return { score, saturation_risk: score > 0.75, protect: score > 0.85 };
}

function environmentRolloutPublicationRuntime() {
  const rollout = require('../activation/environmentActivationRolloutEngine');
  const stage = rollout.resolveActivationStage();
  return {
    stage,
    shadow: require('../navigation/environmentNavigationFlags').isShadowPublication(),
    auto_promotion: false,
    definitive: rollout.allowsDefinitivePublication(stage)
  };
}

function environmentNavigationRuntime() {
  return require('../navigation/environmentNavigationFlags').snapshot();
}

function environmentVisibilityRuntime(ctx = {}) {
  return environmentAudienceContextRuntime(ctx.user);
}

function environmentOperationalVisibilityRuntime(ctx) {
  return environmentOperationalDensityRuntime(ctx?.band);
}

function environmentExecutiveVisibilityRuntime(ctx) {
  return environmentExecutiveDensityRuntime(ctx?.band);
}

function environmentPublicationCapabilityGuard(capability, ctx) {
  const caps = capabilities.resolveEnvironmentCapabilities(ctx);
  return caps.capabilities[capability] === true;
}

module.exports = {
  environmentPublicationRuntime: runtime.environmentPublicationRuntime,
  environmentPublicationValidationRuntime: validation.environmentPublicationValidationRuntime,
  environmentAudienceRuntime,
  environmentAudienceValidationRuntime,
  environmentAudienceContextRuntime,
  environmentOperationalDensityRuntime,
  environmentExecutiveDensityRuntime,
  environmentCognitivePressureRuntime,
  environmentRolloutPublicationRuntime,
  environmentNavigationRuntime,
  environmentVisibilityRuntime,
  environmentOperationalVisibilityRuntime,
  environmentExecutiveVisibilityRuntime,
  environmentPublicationCapabilityGuard,
  environmentPublicationMetricsRuntime: metrics,
  environmentPublicationAuditRuntime: audit,
  ...audience,
  ...capabilities
};
