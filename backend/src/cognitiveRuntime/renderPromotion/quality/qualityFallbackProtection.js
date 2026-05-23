'use strict';

function protectRenderFallback(promotedWidgets = [], legacyWidgets = [], ctx = {}) {
  const legacy = Array.isArray(legacyWidgets) ? legacyWidgets : [];
  const promoted = Array.isArray(promotedWidgets) ? promotedWidgets : [];

  if (promoted.length >= 3) {
    return {
      widgets: promoted,
      fallback_used: false,
      widgets_legacy: legacy,
      rollback_token: ctx.rollback_token || `z22_${Date.now()}`
    };
  }

  const baseline = legacy.length > 0 ? legacy : promoted;
  return {
    widgets: baseline.slice(0, 8),
    fallback_used: true,
    fallback_reason: promoted.length < 3 ? 'insufficient_promoted_widgets' : 'empty_promotion',
    widgets_legacy: legacy,
    rollback_token: ctx.rollback_token || `z22_fb_${Date.now()}`
  };
}

module.exports = { protectRenderFallback };
