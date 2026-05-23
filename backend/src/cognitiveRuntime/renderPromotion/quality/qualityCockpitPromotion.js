'use strict';

const { resolvePromotedWidgetsFromShadow } = require('./qualityWidgetPromotionResolver');
const { buildSuppressionPlan, applySuppressionToWidgetList } = require('./qualityWidgetSuppression');
const { protectRenderFallback } = require('./qualityFallbackProtection');
const { computeOperationalRenderWeight } = require('./qualityOperationalRenderWeight');

function pos(row, col, width = 1) {
  return { row, col, width };
}

/**
 * Compõe layout promovido quality-native para Centro de Comando.
 */
function buildQualityCockpitPromotion(shadowCockpit = {}, legacyLayout = [], qualityPilot = {}, opts = {}) {
  const legacyWidgets = Array.isArray(legacyLayout) ? legacyLayout : [];
  const suppression = buildSuppressionPlan(legacyWidgets, {
    max_suppressed: opts.max_generic_suppressed
  });

  const promoted = resolvePromotedWidgetsFromShadow(shadowCockpit, {
    max_widgets: opts.max_promoted_widgets
  });

  const merged = [];
  const seen = new Set();
  for (const w of promoted) {
    const id = w.id || w.widget_id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(w);
  }

  const filteredLegacy = applySuppressionToWidgetList(legacyWidgets, suppression);
  for (const w of filteredLegacy) {
    const id = w.id || w.widget_id;
    if (!id || seen.has(id)) continue;
    if (suppression.suppressed_generic_ids.includes(id)) continue;
    merged.push({
      ...w,
      id,
      render_active: w.render_active !== false,
      render_promoted: false,
      promotion_source: 'legacy_preserved'
    });
    seen.add(id);
  }

  const protected_ = protectRenderFallback(merged, legacyWidgets, {
    rollback_token: opts.rollback_token
  });

  const weight = computeOperationalRenderWeight(shadowCockpit, qualityPilot);

  return {
    widgets: protected_.widgets,
    widgets_legacy: protected_.widgets_legacy,
    widgets_promoted: promoted,
    suppression,
    operational_weight: weight,
    fallback: {
      used: protected_.fallback_used,
      reason: protected_.fallback_reason
    },
    rollback_token: protected_.rollback_token,
    render_active: true,
    cockpit_domain: 'quality'
  };
}

module.exports = { buildQualityCockpitPromotion };
