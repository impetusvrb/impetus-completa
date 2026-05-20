'use strict';

const phaseH = require('./config/phaseHFeatureFlags');
const { logPhaseH } = require('./phaseHLogger');

/**
 * Detecta overblocking — negações/sanitização excessivas vs baseline útil.
 */
function detectOverblocking(ctx = {}) {
  if (!phaseH.isGovernanceFalsePositiveAnalyzerEnabled() && !ctx.force) {
    return { enabled: false, overblocking_rate: 0, signals: [] };
  }

  const signals = [];
  const total = Math.max(ctx.total_evaluations || 1, 1);
  const denyRate = (ctx.denied_count || 0) / total;
  const kpiSuppression = (ctx.kpis_denied || 0) / Math.max(ctx.kpis_total || 1, 1);
  const sanitizerRate = ctx.sanitizer_aggressiveness ?? 0;

  if (denyRate > 0.4) {
    signals.push({ type: 'high_deny_rate', value: denyRate, severity: 'high' });
    logPhaseH('GOVERNANCE_OVERBLOCKING', { type: 'high_deny_rate', deny_rate: denyRate });
  }

  if (kpiSuppression > 0.6) {
    signals.push({ type: 'kpi_suppression_excess', value: kpiSuppression, severity: 'high' });
    logPhaseH('GOVERNANCE_OVERBLOCKING', { type: 'kpi_suppression', rate: kpiSuppression });
  }

  if (sanitizerRate > 0.55) {
    signals.push({ type: 'sanitizer_aggressive', value: sanitizerRate, severity: 'medium' });
    logPhaseH('GOVERNANCE_SANITIZER_EXCESS', { rate: sanitizerRate });
  }

  if (ctx.cross_domain_blocks > 3 && ctx.cross_domain_legitimate === 0) {
    signals.push({ type: 'cross_domain_false_positive', count: ctx.cross_domain_blocks });
  }

  const overblocking_rate = Math.min(
    1,
    denyRate * 0.4 + kpiSuppression * 0.35 + sanitizerRate * 0.25
  );

  return {
    enabled: true,
    overblocking_rate,
    governance_overblocking_rate: overblocking_rate,
    signals
  };
}

module.exports = { detectOverblocking };
