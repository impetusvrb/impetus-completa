'use strict';

function inferRisk(reasoning = {}, ctx = {}) {
  const detected = reasoning?.detected_risks || [];
  const critical_incidents = ctx?.operational?.critical_incidents || 0;
  const risk_axes = {
    safety: detected.includes('safety') || critical_incidents > 0,
    environmental: detected.includes('environmental'),
    production: detected.includes('production'),
    logistics: detected.includes('logistics'),
    quality: !!ctx?.cognitive?.quality_authority_runtime
  };
  const risk_count = Object.values(risk_axes).filter(Boolean).length;
  const risk_score = Number(Math.min(1, risk_count * 0.2 + (critical_incidents ? 0.2 : 0)).toFixed(3));
  return { risk_axes, risk_count, risk_score };
}

module.exports = { inferRisk };
