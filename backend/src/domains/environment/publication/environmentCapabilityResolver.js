'use strict';

const { ENVIRONMENT_CAPABILITIES } = require('./environmentCapabilityMatrix');
const navFlags = require('../navigation/environmentNavigationFlags');
const rollout = require('../activation/environmentActivationRolloutEngine');

function resolveEnvironmentCapabilities(ctx = {}) {
  const flags = navFlags.snapshot();
  const stage = rollout.resolveActivationStage();
  const shadow = flags.rollout_shadow;
  const moduleLicensed = ctx.hasEnvironmentIntelligenceModule !== false;
  const granted = {};

  for (const [key, def] of Object.entries(ENVIRONMENT_CAPABILITIES)) {
    let allowed = moduleLicensed && flags.publication && flags.navigation;
    if (key === 'environment_intelligence') {
      allowed = moduleLicensed;
    } else if (def.layer === 'operational') {
      allowed = allowed && flags.operational;
    } else if (def.layer === 'governance' || def.layer === 'telemetry') {
      allowed = allowed && flags.publication;
    } else if (def.layer === 'cognitive' || def.layer === 'executive') {
      allowed = allowed && flags.publication && !shadow;
    }
    if (shadow && (def.layer === 'executive' || def.layer === 'cognitive')) {
      allowed = false;
    }
    if (stage === 'shadow' && def.layer === 'executive') {
      allowed = false;
    }
    granted[key] = allowed;
  }

  return {
    domain: 'environment',
    capabilities: granted,
    activation_stage: stage,
    rollout_shadow: shadow,
    publication_stage: stage,
    assistive_only: true
  };
}

module.exports = { resolveEnvironmentCapabilities };
