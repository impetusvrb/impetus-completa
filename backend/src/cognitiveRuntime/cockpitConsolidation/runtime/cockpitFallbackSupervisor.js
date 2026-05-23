'use strict';

function superviseCockpitFallback(consolidated = {}, legacyPayload = {}) {
  const centers = consolidated.centers || [];
  if (centers.length >= 3 && consolidated.widgets?.length >= 3) {
    return {
      ...consolidated,
      fallback_used: false,
      fallback_preserved: true
    };
  }

  const legacyWidgets =
    legacyPayload.widgets_legacy ||
    legacyPayload.engine_v2?.payload?.layout?.widgets ||
    legacyPayload.profile_config?.widgets ||
    [];

  return {
    ...consolidated,
    widgets: legacyWidgets.length ? legacyWidgets.slice(0, 8) : consolidated.widgets,
    fallback_used: true,
    fallback_reason: 'insufficient_consolidated_centers',
    fallback_preserved: true
  };
}

module.exports = { superviseCockpitFallback };
