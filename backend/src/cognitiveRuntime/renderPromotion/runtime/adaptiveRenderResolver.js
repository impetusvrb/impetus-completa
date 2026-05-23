'use strict';

const flagsZ22 = require('../../config/phaseZ22FeatureFlags');

function resolveRenderChannels(ctx = {}) {
  const controlled = flagsZ22.isRenderPromotionControlled() || ctx.force_render_promotion === true;
  return {
    mode: flagsZ22.renderPromotionMode(),
    channels: {
      cockpit_widgets: controlled || flagsZ22.isRenderPromotionShadowCompare(),
      engine_v2_layout: controlled && ctx.has_engine_v2 === true,
      profile_config: controlled,
      center_operational: false
    },
    max_promoted_widgets: flagsZ22.maxPromotedWidgets(),
    max_generic_suppressed: flagsZ22.maxGenericSuppressed()
  };
}

module.exports = { resolveRenderChannels };
