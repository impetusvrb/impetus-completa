'use strict';

function buildProductionRuntimeDeliveryMap(payload = {}, authority = {}) {
  const promoted = payload.widgets_promoted || [];
  const legacy = payload.widgets_legacy || payload.profile_config?.widgets || [];
  const v2Widgets = payload.engine_v2?.payload?.layout?.widgets || [];
  const delivery_map = [];

  const add = (id, runtime, opts = {}) => {
    delivery_map.push({
      widget: id,
      runtime_origin: runtime,
      authoritative: opts.authoritative === true,
      fallback: opts.fallback === true,
      enrich: opts.enrich === true,
      v2_residual: opts.v2_residual === true,
      promotion_applied: payload.cognitive_render_promotion?.promotion_applied === true
    });
  };

  for (const w of promoted) {
    add(w.id || w.widget_id || 'unknown', 'runtime_z', {
      authoritative: authority.authority_mode === 'AUTHORITATIVE_CONTROLLED',
      enrich: false
    });
  }
  for (const w of legacy) {
    add(w.id || w.widget_id || 'legacy', 'motor_a', { fallback: true });
  }
  for (const w of v2Widgets) {
    add(w.id || 'v2_widget', 'engine_v2', { v2_residual: true, enrich: true });
  }

  const authCount = delivery_map.filter((d) => d.authoritative).length;
  const fbCount = delivery_map.filter((d) => d.fallback).length;
  const hidden = legacy.length > promoted.length ? legacy.length - promoted.length : 0;

  return {
    delivery_map,
    authoritative_ratio: Number((authCount / Math.max(delivery_map.length, 1)).toFixed(3)),
    fallback_ratio: Number((fbCount / Math.max(delivery_map.length, 1)).toFixed(3)),
    hidden_legacy_ratio: Number((hidden / Math.max(legacy.length, 1)).toFixed(3)),
    promotion_integrity: payload.cognitive_render_promotion?.promotion_applied === true && promoted.length > 0
  };
}

module.exports = { buildProductionRuntimeDeliveryMap };
