'use strict';

function buildCockpitOperationalMetrics(centers = [], widgets = []) {
  const promoted = widgets.filter((w) => w.render_promoted || w.cognitive_center_id);
  const generic = widgets.filter((w) => w.collapsed_generic);

  return {
    center_count: centers.length,
    promoted_widget_count: promoted.length,
    generic_collapsed_count: generic.length,
    operational_center_count: centers.filter((c) => c.layer === 'operational').length,
    governance_center_count: centers.filter((c) => c.layer === 'governance').length
  };
}

module.exports = { buildCockpitOperationalMetrics };
