'use strict';

const phaseI = require('./config/phaseIFeatureFlags');
const { recordRuntimeSample, computeHealth } = require('./governanceRuntimeHealth');
const { resolveChannelActivation } = require('./governanceActivationRuntime');
const { logPhaseI } = require('./phaseILogger');

/**
 * Observa execução de canal governado pós-activação.
 */
function observeChannelExecution(channel, ctx = {}, outcome = {}) {
  if (!phaseI.isRuntimeGovernanceMonitoringEnabled() && !ctx.force) return;

  const resolution = resolveChannelActivation(channel, ctx);
  recordRuntimeSample({
    channel,
    active: resolution.active,
    source: resolution.source,
    denied: outcome.denied === true,
    sanitized: outcome.sanitized === true,
    degraded: outcome.degraded === true,
    tenant_id: ctx.tenant_id || ctx.user?.company_id
  });

  if (outcome.leakage_prevented) {
    logPhaseI('CHAT_LEAKAGE_PREVENTED', { channel, tenant_id: ctx.tenant_id });
  }
  if (outcome.context_restricted) {
    logPhaseI('CHAT_CONTEXT_RESTRICTED', { channel });
  }
  if (outcome.summary_degraded) {
    logPhaseI('SUMMARY_CONTEXT_DEGRADATION', { channel });
  }
  if (outcome.boundary_blocked) {
    logPhaseI('BOUNDARY_VIOLATION_BLOCKED', { channel });
  }

  return computeHealth();
}

module.exports = { observeChannelExecution };
