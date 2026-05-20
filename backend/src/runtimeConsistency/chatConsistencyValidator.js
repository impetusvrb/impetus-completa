'use strict';

const { logPhaseQ } = require('./phaseQLogger');
const phaseQ = require('./config/phaseQFeatureFlags');

function validateChatConsistency(chatCtx = {}, sync = {}) {
  const axis = chatCtx.functional_axis || chatCtx.context_axis;
  const match = !axis || !sync.canonical_axis || String(axis).toLowerCase() === sync.canonical_axis;
  const severity = chatCtx.severity || chatCtx.risk_level;
  const dashboardSeverity = chatCtx.dashboard_severity;
  const severityMismatch = severity && dashboardSeverity && severity !== dashboardSeverity;

  if ((!match || severityMismatch) && phaseQ.isRuntimeConsistencyObservabilityEnabled()) {
    logPhaseQ('INTERCHANNEL_DIVERGENCE_DETECTED', { channel: 'chat', axis_match: match, severityMismatch, shadow_only: true });
  }

  return {
    channel: 'chat',
    consistent: match && !severityMismatch,
    axis,
    severity_mismatch: severityMismatch,
    issues: [
      ...(match ? [] : [{ type: 'chat_dashboard_axis_mismatch' }]),
      ...(severityMismatch ? [{ type: 'severity_inconsistency' }] : [])
    ]
  };
}

module.exports = { validateChatConsistency };
