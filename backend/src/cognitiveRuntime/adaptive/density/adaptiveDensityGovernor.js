'use strict';

function suggestAdaptiveDensity(payload = {}, fatigue = {}, domain = 'default') {
  const limits = domain === 'executive' ? { centers: 5, widgets: 7 } : { centers: 6, widgets: 8 };
  const centers = _countCenters(payload);
  const widgets = (payload.widgets_promoted || []).filter((w) => !w.collapsed_generic).length;
  const suggestions = [];
  if (centers > limits.centers) suggestions.push({ type: 'reduce_centers', from: centers, to: limits.centers });
  if (widgets > limits.widgets) suggestions.push({ type: 'reduce_widgets', from: widgets, to: limits.widgets });
  if (fatigue.fatigue_detected) suggestions.push({ type: 'simplify_alerts', reason: 'fatigue' });
  return { density_adjustment_suggested: suggestions, within_limits: suggestions.length === 0 };
}

function _countCenters(payload) {
  const lists = [
    payload.executive_cognitive_centers,
    payload.environmental_cognitive_centers,
    payload.production_cognitive_centers,
    payload.hr_cognitive_centers,
    payload.safety_cognitive_centers,
    payload.quality_cognitive_centers
  ].filter(Array.isArray);
  return Math.max(...lists.map((l) => l.length), 0);
}

module.exports = { suggestAdaptiveDensity };
