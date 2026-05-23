'use strict';

const flags = require('../../config/phaseZM1FeatureFlags');
const { resolvePromotedMaintenanceWidgetsFromShadow } = require('./maintenanceWidgetPromotionResolver');
const { sanitizePromotedWidgets } = require('../runtime/cognitiveRenderSafety');

function isMaintenanceProfile(payload = {}, ctx = {}) {
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || '').toLowerCase();
  return flags.isPilotProfile(pc) || axis === 'maintenance' || axis === 'manutencao' || axis === 'manutenção';
}

function applyMaintenanceControlledRenderPromotion(user = {}, payload = {}, ctx = {}, maintPilot = {}) {
  if (!flags.isMaintenanceRenderPromotionControlled() && !ctx.force_maintenance_render) {
    return { payload, skipped: true, reason: 'maintenance_render_off' };
  }
  if (!isMaintenanceProfile(payload, ctx)) return { payload, skipped: true, reason: 'not_maintenance_profile' };
  if (maintPilot?.pilot_skipped) return { payload, skipped: true, reason: maintPilot.reason };

  const widgets = sanitizePromotedWidgets(
    resolvePromotedMaintenanceWidgetsFromShadow(maintPilot.shadow_cognitive_cockpit || {}, { max_widgets: flags.maxWidgets() })
  );
  const enriched = {
    ...payload,
    widgets_promoted: widgets,
    widgets_legacy: payload.widgets_legacy || payload.profile_config?.widgets,
    cognitive_render_promotion: {
      phase: 'Z.M1',
      promotion_applied: true,
      render_active: true,
      cockpit_mode: 'maintenance_native',
      global_replace: false
    }
  };
  return { payload: enriched, ok: true, cognitive_render_promotion: enriched.cognitive_render_promotion };
}

module.exports = { applyMaintenanceControlledRenderPromotion, isMaintenanceProfile };
