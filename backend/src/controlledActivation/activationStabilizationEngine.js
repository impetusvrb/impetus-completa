'use strict';

const phaseS = require('./config/phaseSFeatureFlags');
const { logPhaseS } = require('./phaseSLogger');

function detectActivationIssues(ctx = {}) {
  const issues = [];
  if (ctx.leakage_count > 0) issues.push({ type: 'leakage', severity: 'high' });
  if (ctx.underdelivery) issues.push({ type: 'underdelivery', severity: 'medium' });
  if (ctx.hierarchy_mismatch) issues.push({ type: 'hierarchy_mismatch', severity: 'high' });
  if (ctx.authority_mismatch) issues.push({ type: 'authority_mismatch', severity: 'medium' });
  if (ctx.interchannel_divergence) issues.push({ type: 'interchannel_divergence', severity: 'high' });
  if (ctx.delivery_instability) issues.push({ type: 'delivery_instability', severity: 'high' });

  if (issues.length && phaseS.isControlledActivationObservabilityEnabled()) {
    logPhaseS('ACTIVATION_STABILIZATION_ISSUE', { count: issues.length, shadow_only: true });
  }

  return {
    issues,
    activation_stability: issues.length === 0 ? 0.92 : Math.max(0.45, 0.92 - issues.length * 0.08),
    enforcement_active: phaseS.isRuntimeStabilizationMonitorEnabled(),
    shadow_only: !phaseS.isRuntimeStabilizationMonitorEnabled()
  };
}

module.exports = { detectActivationIssues };
