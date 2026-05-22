'use strict';

const flagsZ19 = require('../config/phaseZ19FeatureFlags');
const { composeRuntimeCockpit } = require('../composition/runtimeCockpitComposer');
const { QUALITY_PILOT_BLOCK_IDS } = require('../registry/qualityCognitiveBlockPack');

function isQualityPilotActive(ctx = {}) {
  const mode = flagsZ19.qualityCockpitPilotMode();
  const qMode = flagsZ19.qualityCockpitMode();
  return (
    mode === 'shadow' ||
    qMode === 'shadow' ||
    flagsZ19.isCompositionEngineEnabled() ||
    flagsZ19.isCompositionObservabilityEnabled() ||
    ctx.force_quality_pilot === true
  );
}

function isQualityProfile(payload = {}, ctx = {}) {
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || ctx.domain_axis || '').toLowerCase();
  return pc.includes('quality') || axis === 'quality';
}

/**
 * Piloto Quality — composição shadow apenas para perfis/domínio quality.
 */
async function runQualityCockpitPilot(user = {}, payload = {}, ctx = {}) {
  if (!isQualityPilotActive(ctx)) {
    return {
      pilot_skipped: true,
      reason: 'quality_cockpit_pilot_off',
      phase: 'Z.19'
    };
  }

  if (!isQualityProfile(payload, ctx)) {
    return {
      pilot_skipped: true,
      reason: 'not_quality_profile',
      phase: 'Z.19',
      profile_code: payload.profile_code
    };
  }

  const composition = await composeRuntimeCockpit(user, payload, {
    ...ctx,
    domain_axis: 'quality',
    force_composition: ctx.force_composition === true
  });

  return {
    pilot_id: 'quality_cognitive_pilot_v1',
    pilot_active: true,
    official_block_ids: QUALITY_PILOT_BLOCK_IDS,
    ...composition
  };
}

module.exports = {
  isQualityPilotActive,
  isQualityProfile,
  runQualityCockpitPilot
};
