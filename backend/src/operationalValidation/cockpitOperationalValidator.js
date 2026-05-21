'use strict';

const { assessCockpitGovernanceConsistency } = require('../terminalGovernance/cockpitGovernanceConsistency');

function validateCockpitOperational(payload = {}, ctx = {}) {
  const consistency = assessCockpitGovernanceConsistency(payload, ctx);
  const bleed = consistency.cross_domain_bleed || [];
  const widgets = payload.widgets || payload.engine_v2?.widgets || [];
  const domain = ctx.domain_axis || payload.functional_axis || 'quality';

  const widgetDrift = widgets.filter((w) => w.domain && w.domain !== domain);
  const duplication =
    widgets.length > 0 &&
    new Set(widgets.map((w) => w.id || w.type)).size < widgets.length * 0.8;
  const overload = widgets.length > 12;

  const integrity =
    bleed.length === 0 && widgetDrift.length === 0
      ? 1
      : Math.max(0, 1 - (bleed.length + widgetDrift.length) * 0.15);

  const usefulness =
    payload.visible_modules?.includes('dashboard') !== false
      ? Math.min(1, 0.5 + (payload.kpis || []).length * 0.1 + (consistency.cockpit_consistent ? 0.3 : 0))
      : 0.3;

  return {
    cockpit_integrity: Number(integrity.toFixed(2)),
    operational_usefulness: Number(usefulness.toFixed(2)),
    cockpit_consistent: consistency.cockpit_consistent,
    cockpit_drift: widgetDrift.length > 0,
    cockpit_bleed: bleed.length > 0,
    cockpit_duplication: duplication,
    operational_overload: overload,
    widgets_governed: consistency.widgets_governed,
    telemetry_governed: consistency.telemetry_governed,
    domain_integrity: widgetDrift.length === 0,
    issues: [...bleed, ...widgetDrift.map((w) => ({ type: 'widget_drift', id: w.id }))]
  };
}

module.exports = { validateCockpitOperational };
