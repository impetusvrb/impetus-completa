'use strict';

const { measureDashboardPressure } = require('../fatigue/dashboardPressureRuntime');
const { analyzeCognitiveFatigue } = require('../fatigue/cognitiveFatigueAnalyzer');

function analyzeAdaptivePressure(payload = {}) {
  const dash = measureDashboardPressure(payload);
  const fatigue = analyzeCognitiveFatigue(payload);
  const cross = dash.domain_count * 0.1 + fatigue.pressure_score * 0.5;
  return {
    cross_domain_pressure: Math.round(cross * 100) / 100,
    cognitive_pressure: fatigue.pressure_score,
    saturation: dash.saturation || fatigue.fatigue_detected
  };
}

module.exports = { analyzeAdaptivePressure };
