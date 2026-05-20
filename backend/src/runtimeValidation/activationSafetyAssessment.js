'use strict';

const SAFE_CHANNELS = ['kpi'];
const SENSITIVE_CHANNELS = ['chat', 'summary', 'boundary'];

function assessActivationSafety(ctx = {}) {
  let readiness = {};
  try {
    readiness = require('../governanceReadiness/governanceReadinessEngine').assessReadiness({ force: true });
  } catch {
    readiness = { readiness_score: 70 };
  }

  const score = readiness.readiness_score ?? 70;
  const channels = {
    kpi: { safe: score >= 75, sensitivity: 'low' },
    summary: { safe: score >= 82, sensitivity: 'medium' },
    chat: { safe: score >= 88, sensitivity: 'high' },
    boundary: { safe: score >= 85, sensitivity: 'high' }
  };

  const safe_channels = Object.entries(channels).filter(([, v]) => v.safe).map(([k]) => k);
  const sensitive_channels = SENSITIVE_CHANNELS.filter((c) => !safe_channels.includes(c));

  return {
    activation_safety_score: readiness.activation_safety_score ?? score,
    safe_channels,
    sensitive_channels,
    channel_assessment: channels,
    activation_ready: score >= 75 && readiness.leakage_risk !== 'high',
    auto_activation: false
  };
}

module.exports = { assessActivationSafety, SAFE_CHANNELS, SENSITIVE_CHANNELS };
