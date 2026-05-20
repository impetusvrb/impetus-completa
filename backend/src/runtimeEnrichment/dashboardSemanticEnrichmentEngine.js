'use strict';

const phaseX = require('./config/phaseXFeatureFlags');
const { logPhaseX } = require('./phaseXLogger');
const { extractModules, extractWidgets } = require('./runtimePayloadUtils');

function enrichDashboardSemantics(payload, ctx = {}) {
  const modules = extractModules(payload);
  const widgets = extractWidgets(payload);
  const deadCards = widgets.filter((w) => w.empty || w.dead || w.placeholder);
  const usefulModules = modules.filter((m) => m && !m.hidden && !m.placeholder);
  const issues = [];

  if (modules.length === 0) issues.push({ type: 'semantically_empty_dashboard', severity: 'high' });
  if (widgets.length > 0 && deadCards.length / widgets.length > 0.4) {
    issues.push({ type: 'dead_cards', severity: 'medium', ratio: deadCards.length / widgets.length });
  }
  if (usefulModules.length < 2 && modules.length > 0) {
    issues.push({ type: 'low_module_usefulness', severity: 'medium' });
  }

  if (issues.some((i) => i.type === 'semantically_empty_dashboard') && phaseX.isRuntimeEnrichmentObservabilityEnabled()) {
    logPhaseX('SEMANTICALLY_EMPTY_DASHBOARD_DETECTED', { shadow_only: true });
  }

  const usefulness = modules.length
    ? usefulModules.length / modules.length
    : widgets.length
      ? 1 - deadCards.length / Math.max(widgets.length, 1)
      : 0.35;

  return {
    dashboard_usefulness: Number(usefulness.toFixed(4)),
    module_count: modules.length,
    widget_count: widgets.length,
    dead_card_count: deadCards.length,
    issues,
    recommendations: issues.length
      ? ['Recomendação: rever cards/módulos sem sinal operacional — sem remoção automática']
      : [],
    auto_remove: false,
    enforcement_active: phaseX.isDashboardEnrichmentEnabled()
  };
}

module.exports = { enrichDashboardSemantics };
