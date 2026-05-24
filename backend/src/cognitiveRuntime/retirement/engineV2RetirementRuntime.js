'use strict';

const c6 = require('../config/phaseC6FeatureFlags');

const MODES = Object.freeze(['active_legacy', 'shadow_reference', 'retired_shadow_reference']);

function retireEngineV2(payload = {}) {
  const configured = c6.engineV2RetirementMode();
  const engine_v2_runtime_mode = MODES.includes(configured) ? configured : 'retired_shadow_reference';

  const v2Widgets = payload.engine_v2?.payload?.layout?.widgets || [];
  const promoted = payload.widgets_promoted?.length ?? 0;
  const promotionApplied = payload.cognitive_render_promotion?.promotion_applied === true;

  const active_delivery_channels = [];
  if (engine_v2_runtime_mode === 'active_legacy' && v2Widgets.length) {
    active_delivery_channels.push('widgets', 'layout');
  }
  if (engine_v2_runtime_mode === 'retired_shadow_reference' && v2Widgets.length && !promotionApplied) {
    active_delivery_channels.push('residual_v2_audit_only');
  }

  const dominatesDelivery =
    v2Widgets.length > promoted && engine_v2_runtime_mode !== 'retired_shadow_reference';
  const residual_influence_ratio = Number(
    (v2Widgets.length / Math.max(v2Widgets.length + promoted, 1)).toFixed(3)
  );

  const retirement_safe =
    engine_v2_runtime_mode === 'retired_shadow_reference'
      ? !dominatesDelivery && active_delivery_channels.every((c) => c === 'residual_v2_audit_only' || active_delivery_channels.length === 0)
      : true;

  return {
    engine_v2_runtime_mode,
    active_delivery_channels,
    residual_influence_ratio,
    retirement_safe: retirement_safe || (engine_v2_runtime_mode === 'retired_shadow_reference' && promotionApplied),
    rollback_available: true,
    v2_physically_removed: false,
    v2_auditable: true,
    auto_mutation: false
  };
}

module.exports = { retireEngineV2 };
