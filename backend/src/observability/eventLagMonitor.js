'use strict';

/**
 * WAVE 2 — monitorização de lag do pipeline / outbox industrial.
 */

const { isEventLagMonitoringEnabled } = require('./observabilityFlags');
const slo = require('./sloSliRegistry');
const tenantMetrics = require('./tenantMetricsRegistry');

const _lagSamples = [];
const MAX_SAMPLES = 500;

/**
 * @param {{ event_name?: string, domain?: string, company_id?: string, enqueued_at?: string|number, delivered_at?: number }} evt
 */
function recordEventLag(evt) {
  if (!isEventLagMonitoringEnabled()) return;

  const now = Date.now();
  let lagMs = 0;
  if (evt.enqueued_at != null) {
    const t = typeof evt.enqueued_at === 'number' ? evt.enqueued_at : Date.parse(evt.enqueued_at);
    if (!Number.isNaN(t)) lagMs = Math.max(0, now - t);
  } else if (evt.delivered_at != null && evt.enqueued_at == null) {
    lagMs = 0;
  }

  const sample = {
    lag_ms: lagMs,
    event_name: evt.event_name || 'unknown',
    domain: evt.domain || 'unknown',
    ts: now
  };

  _lagSamples.push(sample);
  if (_lagSamples.length > MAX_SAMPLES) _lagSamples.shift();

  tenantMetrics.observeHistogram('impetus_outbox_lag_ms', lagMs, { domain: sample.domain });
  tenantMetrics.setGauge('impetus_outbox_pending', _lagSamples.filter((s) => s.lag_ms > 5000).length);
  slo.recordOutboxLagSli(lagMs);
}

function recordPublishToOutbox(envelope) {
  if (!envelope) return;
  recordEventLag({
    event_name: envelope.event_name,
    domain: envelope.domain,
    company_id: envelope.company_id,
    enqueued_at: envelope.occurred_at || Date.now()
  });
}

function getLagStats() {
  if (!_lagSamples.length) {
    return { count: 0, p50_ms: 0, p95_ms: 0, p99_ms: 0, max_ms: 0 };
  }
  const vals = _lagSamples.map((s) => s.lag_ms).sort((a, b) => a - b);
  const p = (pct) => vals[Math.min(vals.length - 1, Math.floor((pct / 100) * vals.length))];
  return {
    count: vals.length,
    p50_ms: p(50),
    p95_ms: p(95),
    p99_ms: p(99),
    max_ms: vals[vals.length - 1]
  };
}

module.exports = {
  recordEventLag,
  recordPublishToOutbox,
  getLagStats
};
