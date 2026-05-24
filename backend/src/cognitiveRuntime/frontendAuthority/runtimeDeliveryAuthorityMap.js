'use strict';

const c6 = require('../config/phaseC6FeatureFlags');

function buildRuntimeDeliveryAuthorityMap(payload = {}) {
  const promoted = payload.widgets_promoted || [];
  const legacy = payload.widgets_legacy || payload.profile_config?.widgets || [];
  const v2Widgets = payload.engine_v2?.payload?.layout?.widgets || [];
  const v2Mode = c6.engineV2RetirementMode();

  const authoritative_widgets = [];
  const fallback_widgets = [];
  const legacy_widgets = [];
  const frontend_authority_map = [];

  const push = (list, entry) => {
    list.push(entry);
    frontend_authority_map.push(entry);
  };

  for (const w of promoted) {
    const id = w.id || w.widget_id || 'promoted';
    push(authoritative_widgets, {
      widget: id,
      authority_runtime: c6.sovereignRuntimeId(),
      fallback_runtime: c6.fallbackRuntimeId(),
      legacy_participation: false,
      frontend_rendering_authority: 'runtime_z'
    });
  }

  for (const w of legacy) {
    const id = w.id || w.widget_id || 'legacy';
    push(fallback_widgets, {
      widget: id,
      authority_runtime: c6.sovereignRuntimeId(),
      fallback_runtime: c6.fallbackRuntimeId(),
      legacy_participation: true,
      frontend_rendering_authority: 'motor_a_fallback'
    });
    push(legacy_widgets, id);
  }

  for (const w of v2Widgets) {
    const id = w.id || 'v2_widget';
    push(legacy_widgets, id);
    frontend_authority_map.push({
      widget: id,
      authority_runtime: v2Mode === 'retired_shadow_reference' ? c6.sovereignRuntimeId() : 'engine_v2',
      fallback_runtime: c6.fallbackRuntimeId(),
      legacy_participation: true,
      frontend_rendering_authority: v2Mode === 'retired_shadow_reference' ? 'shadow_reference_only' : 'engine_v2'
    });
  }

  const total = authoritative_widgets.length + fallback_widgets.length;
  const runtime_z_dominance_ratio = Number(
    (authoritative_widgets.length / Math.max(total, 1)).toFixed(3)
  );

  return {
    authoritative_widgets,
    fallback_widgets,
    legacy_widgets,
    runtime_z_dominance_ratio,
    frontend_authority_map
  };
}

module.exports = { buildRuntimeDeliveryAuthorityMap };
