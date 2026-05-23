'use strict';

const { buildQualityCockpitPromotion } = require('./qualityCockpitPromotion');

function runQualityRenderPromotion(shadowCockpit = {}, payload = {}, qualityPilot = {}, opts = {}) {
  const legacyLayout =
    payload.engine_v2?.payload?.layout?.widgets ||
    payload.profile_config?.widgets ||
    payload.widgets ||
    [];

  const promotion = buildQualityCockpitPromotion(
    shadowCockpit,
    legacyLayout,
    qualityPilot,
    opts
  );

  return {
    ok: promotion.widgets.length > 0,
    ...promotion,
    profile_code: payload.profile_code,
    phase: 'Z.22'
  };
}

module.exports = { runQualityRenderPromotion };
