'use strict';

function buildRollbackSnapshot(payload = {}, promotion = {}) {
  return {
    rollback_token: promotion.rollback_token || `z22_rb_${Date.now()}`,
    widgets_legacy: promotion.widgets_legacy || payload.widgets_legacy || [],
    profile_config_legacy: payload.profile_config
      ? {
          cards: payload.profile_config.cards,
          widgets: payload.profile_config.widgets
        }
      : null,
    engine_v2_widgets_legacy: payload.engine_v2?.payload?.layout?.widgets
      ? [...payload.engine_v2.payload.layout.widgets]
      : null,
    captured_at: new Date().toISOString()
  };
}

function applyRollback(payload = {}, snapshot = {}) {
  const out = { ...payload };
  if (snapshot.widgets_legacy?.length) {
    out.widgets = snapshot.widgets_legacy;
    out.cognitive_render_promotion = {
      ...(out.cognitive_render_promotion || {}),
      render_active: false,
      promotion_applied: false,
      rollback_applied: true
    };
  }
  if (snapshot.profile_config_legacy && out.profile_config) {
    out.profile_config = {
      ...out.profile_config,
      ...snapshot.profile_config_legacy
    };
  }
  if (snapshot.engine_v2_widgets_legacy && out.engine_v2?.payload?.layout) {
    out.engine_v2 = {
      ...out.engine_v2,
      payload: {
        ...out.engine_v2.payload,
        layout: {
          ...out.engine_v2.payload.layout,
          widgets: snapshot.engine_v2_widgets_legacy
        }
      }
    };
  }
  return out;
}

module.exports = { buildRollbackSnapshot, applyRollback };
