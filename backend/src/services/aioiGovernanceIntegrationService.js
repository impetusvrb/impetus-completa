'use strict';

/**
 * EVENT-GOVERNANCE-12 — orquestração consumo cognitivo AIOI sobre eventos governados.
 * Non-blocking; não altera produtores EG-01..EG-11C.
 */

const feed = require('./aioiGovernanceFeedService');
const correlation = require('./aioiCorrelationService');
const insightService = require('./aioiInsightService');

function _isAioiProducedEvent(event) {
  const cat = String(event?.category || '').toLowerCase();
  const src = String(event?.sourceModule || '').toLowerCase();
  const et = String(event?.eventType || '').toLowerCase();
  return cat === 'aioi' || src.includes('aioiinsight') || et.startsWith('aioi_insight');
}

/**
 * Callback passivo após evaluatePrepareAndExecute (EG-12).
 * @param {object} event
 * @param {object} governanceResult
 */
async function onGovernedEvent(event, governanceResult) {
  if (!event?.companyId || _isAioiProducedEvent(event)) {
    return { skipped: true, reason: 'aioi_loop_guard' };
  }

  const adapter = require('./governanceAdapters/aioiGovernanceAdapter');
  feed.recordGovernedEvent(event, governanceResult);
  adapter.recordObservation({ events: 1 });

  const events = feed.getGovernedEvents(event.companyId, { approvedOnly: true });
  const correlations = correlation.detectCorrelations(events);
  if (correlations.length) {
    adapter.recordObservation({ correlations: correlations.length });
  }

  const insights = insightService.generateInsights(events, correlations);
  if (!insights.length) {
    return { mode: adapter.isAioiGovernanceEnabled() ? 'governance_idle' : 'shadow_idle', correlations: correlations.length };
  }

  const results = [];
  for (const insight of insights.slice(-3)) {
    const r = await adapter.dispatchAioiInsight({ companyId: event.companyId, insight });
    results.push(r);
  }

  return {
    mode: adapter.isAioiGovernanceEnabled() ? 'governance' : 'shadow',
    correlations: correlations.length,
    insights: insights.length,
    results
  };
}

module.exports = {
  onGovernedEvent,
  _isAioiProducedEvent
};
