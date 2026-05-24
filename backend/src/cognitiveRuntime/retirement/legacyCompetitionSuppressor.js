'use strict';

const c6 = require('../config/phaseC6FeatureFlags');

function suppressLegacyCompetition(payload = {}, v2Retirement = {}, sovereignty = {}) {
  const v2Widgets = payload.engine_v2?.payload?.layout?.widgets || [];
  const promoted = payload.widgets_promoted || [];
  const legacy = payload.widgets_legacy || [];
  const suppressed_legacy_channels = [];

  const duplicate_runtime_delivery =
    v2Widgets.length > 0 &&
    promoted.length > 0 &&
    c6.engineV2RetirementMode() === 'retired_shadow_reference';

  if (duplicate_runtime_delivery) {
    suppressed_legacy_channels.push({ channel: 'engine_v2_widgets', action: 'shadow_reference_only', executed: false });
  }

  if (legacy.length > promoted.length && payload.cognitive_render_promotion?.promotion_applied) {
    suppressed_legacy_channels.push({ channel: 'motor_a_excess_widgets', action: 'fallback_only', executed: false });
  }

  const legacy_competition_detected =
    sovereignty.multi_runtime_conflict_detected ||
    duplicate_runtime_delivery ||
    v2Retirement.active_delivery_channels?.some((c) => c !== 'residual_v2_audit_only');

  const competition_safe =
    !legacy_competition_detected ||
    (c6.engineV2RetirementMode() === 'retired_shadow_reference' && !v2Retirement.active_delivery_channels?.includes('widgets'));

  return {
    legacy_competition_detected,
    duplicate_runtime_delivery,
    suppressed_legacy_channels,
    competition_safe,
    advisory_only: true,
    auto_mutation: false
  };
}

module.exports = { suppressLegacyCompetition };
