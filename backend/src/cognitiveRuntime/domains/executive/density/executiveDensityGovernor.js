'use strict';

const flags = require('../../../config/phaseZ27FeatureFlags');

function applyExecutiveDensityGovernor(centers = [], widgets = []) {
  const maxC = flags.maxCenters();
  const maxW = flags.maxWidgets();
  const sorted = [...centers].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  const govCenters = sorted.slice(0, maxC);
  const govWidgets = widgets.filter((w) => !w.collapsed_generic).slice(0, maxW);
  const alertCenters = govCenters.filter((c) => c.render_slot === 'alertas').length;
  return {
    centers: govCenters,
    widgets: govWidgets,
    density: {
      centers: govCenters.length,
      widgets: govWidgets.length,
      density_safe: govCenters.length <= maxC && govWidgets.length <= maxW,
      alert_slots: alertCenters
    }
  };
}

module.exports = { applyExecutiveDensityGovernor };
