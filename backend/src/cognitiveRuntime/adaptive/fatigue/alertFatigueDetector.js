'use strict';

const { analyzeCognitiveFatigue } = require('./cognitiveFatigueAnalyzer');

function detectAlertFatigue(payload = {}) {
  const f = analyzeCognitiveFatigue(payload);
  return { alert_fatigue: f.alert_count > 3, alert_count: f.alert_count, recommend_reduce: f.alert_count > 3 };
}

module.exports = { detectAlertFatigue };
