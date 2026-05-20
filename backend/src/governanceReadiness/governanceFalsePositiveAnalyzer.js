'use strict';

const phaseH = require('./config/phaseHFeatureFlags');
const { logPhaseH } = require('./phaseHLogger');

/**
 * Detecta falsos positivos de governança (bloqueio sem divergência shadow clara).
 */
function analyzeFalsePositives(ctx = {}) {
  if (!phaseH.isGovernanceFalsePositiveAnalyzerEnabled() && !ctx.force) {
    return { enabled: false, false_positive_rate: 0, incidents: [] };
  }

  const incidents = [];
  const {
    denied_count = 0,
    total_evaluations = 1,
    shadow_diverged = false,
    channel,
    domain,
    denial_reason,
    useful_context_removed = 0
  } = ctx;

  if (denied_count > 0 && !shadow_diverged && denial_reason === 'domain_not_authorized') {
    incidents.push({
      type: 'deny_without_shadow_confirmation',
      channel,
      domain,
      severity: 'medium'
    });
  }

  if (useful_context_removed > 5 && denied_count === 0) {
    incidents.push({
      type: 'sanitizer_stripped_operational_context',
      channel,
      severity: 'low'
    });
    logPhaseH('GOVERNANCE_CONTEXT_LOSS', { channel, stripped: useful_context_removed });
  }

  if (ctx.empty_summary && ctx.had_source_data) {
    incidents.push({ type: 'summary_empty_after_governance', channel, severity: 'high' });
    logPhaseH('GOVERNANCE_FALSE_POSITIVE', { type: 'empty_summary', channel });
  }

  const false_positive_rate = Math.min(1, incidents.length / Math.max(total_evaluations, 1));

  if (incidents.length) {
    logPhaseH('GOVERNANCE_FALSE_POSITIVE', {
      count: incidents.length,
      rate: false_positive_rate,
      channel
    });
  }

  return {
    enabled: true,
    false_positive_rate,
    incidents,
    governance_false_positive_rate: false_positive_rate
  };
}

module.exports = { analyzeFalsePositives };
