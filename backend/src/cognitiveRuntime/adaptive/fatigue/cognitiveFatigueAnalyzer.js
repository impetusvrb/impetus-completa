'use strict';

function analyzeCognitiveFatigue(payload = {}) {
  const widgets = (payload.widgets_promoted || []).filter((w) => w.render_promoted !== false && !w.collapsed_generic);
  const alertSlots = _countAlertSlots(payload);
  const metrics = _countMetrics(payload);
  const pressure = widgets.length * 0.08 + alertSlots * 0.15 + metrics * 0.02;
  return {
    fatigue_detected: pressure > 0.85 || alertSlots > 3 || widgets.length > 8,
    alert_count: alertSlots,
    widget_count: widgets.length,
    metric_count: metrics,
    pressure_score: Math.round(pressure * 100) / 100,
    executive_fatigue: _isExecutive(payload) && alertSlots > 2
  };
}

function _countAlertSlots(payload) {
  const centers = [
    ...(payload.executive_cognitive_centers || []),
    ...(payload.environmental_cognitive_centers || []),
    ...(payload.production_cognitive_centers || []),
    ...(payload.hr_cognitive_centers || []),
    ...(payload.safety_cognitive_centers || []),
    ...(payload.quality_cognitive_centers || [])
  ];
  return centers.filter((c) => c.render_slot === 'alertas').length;
}

function _countMetrics(payload) {
  const centers = payload.executive_cognitive_centers || payload.production_cognitive_centers || [];
  return centers.reduce((n, c) => n + Object.keys(c.metrics || {}).length, 0);
}

function _isExecutive(payload) {
  return payload.executive_cognitive_runtime?.consolidation_applied === true;
}

module.exports = { analyzeCognitiveFatigue };
