'use strict';

function buildProductionOperationalMetrics(centers = [], widgets = []) {
  const opCenters = centers.filter((c) => c.layer === 'operational');
  return {
    centers_visible: centers.length,
    widgets_visible: widgets.filter((w) => w.render_promoted !== false && !w.collapsed_generic).length,
    operational_center_ratio: centers.length ? opCenters.length / centers.length : 0,
    telemetry_centers: centers.filter((c) => c.center_id?.includes('telemetry')).length
  };
}

module.exports = { buildProductionOperationalMetrics };
