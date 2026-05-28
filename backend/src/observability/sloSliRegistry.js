'use strict';

/**
 * WAVE 2 — infraestrutura SLO/SLI (in-memory, low-overhead).
 */

const { isSloMonitoringEnabled } = require('./observabilityFlags');
const tenantMetrics = require('./tenantMetricsRegistry');

const SLI_DEFINITIONS = Object.freeze([
  {
    name: 'api_availability',
    description: 'Taxa de respostas HTTP não-5xx',
    target: 0.995,
    window_samples: 200
  },
  {
    name: 'api_latency_p95',
    description: 'Latência p95 HTTP < 2000ms',
    target_ms: 2000,
    window_samples: 200
  },
  {
    name: 'outbox_lag_p95',
    description: 'Lag p95 outbox industrial < 30000ms',
    target_ms: 30000,
    window_samples: 100
  },
  {
    name: 'dlq_ingress_rate',
    description: 'Taxa DLQ < 1/min',
    target_per_min: 1,
    window_samples: 60
  },
  {
    name: 'cognitive_pressure',
    description: 'Pressão cognitiva média < 0.7',
    target_max: 0.7,
    window_samples: 50
  },
  {
    name: 'dashboard_latency_p95',
    description: 'Latência p95 Engine V2 compose < 1500ms (T1.12)',
    target_ms: 1500,
    window_samples: 100
  },
  {
    name: 'ai_chat_latency_p95',
    description: 'Latência p95 resposta IA chat < 1500ms (T1.12)',
    target_ms: 1500,
    window_samples: 100
  },
  {
    name: 'sz5_query_latency_p95',
    description: 'Latência p95 build contexto SZ5 < 800ms',
    target_ms: 800,
    window_samples: 80
  },
  {
    name: 'error_rate',
    description: 'Taxa de erros APM < 2%',
    target_max: 0.02,
    window_samples: 200
  },
  {
    name: 'ai_safety_review_rate',
    description: 'Taxa de revisão humana hallucination < 15%',
    target_max: 0.15,
    window_samples: 100
  }
]);

const _samples = new Map();

function _pushSample(sliName, value) {
  const def = SLI_DEFINITIONS.find((d) => d.name === sliName);
  const cap = def ? def.window_samples : 100;
  const arr = _samples.get(sliName) || [];
  arr.push({ value: Number(value), ts: Date.now() });
  while (arr.length > cap) arr.shift();
  _samples.set(sliName, arr);
}

function recordSliSample(sliName, value) {
  if (!isSloMonitoringEnabled()) return;
  _pushSample(sliName, value);
}

function recordHttpSli(statusCode, durationMs) {
  if (!isSloMonitoringEnabled()) return;
  const ok = Number(statusCode) < 500 ? 1 : 0;
  _pushSample('api_availability', ok);
  _pushSample('api_latency_p95', durationMs);
}

function recordOutboxLagSli(lagMs) {
  if (!isSloMonitoringEnabled()) return;
  _pushSample('outbox_lag_p95', lagMs);
}

function recordDlqSli(countDelta) {
  if (!isSloMonitoringEnabled()) return;
  _pushSample('dlq_ingress_rate', countDelta);
}

function recordCognitivePressureSli(pressure) {
  if (!isSloMonitoringEnabled()) return;
  _pushSample('cognitive_pressure', pressure);
}

function recordApmSli(domain, durationMs, status) {
  if (!isSloMonitoringEnabled()) return;
  const err = status === 'error' ? 1 : 0;
  _pushSample('error_rate', err);
  if (domain === 'dashboard') _pushSample('dashboard_latency_p95', durationMs);
  if (domain === 'ai_chat') _pushSample('ai_chat_latency_p95', durationMs);
  if (domain === 'sz5') _pushSample('sz5_query_latency_p95', durationMs);
}

function recordAiSafetySli(requiresReview) {
  if (!isSloMonitoringEnabled()) return;
  _pushSample('ai_safety_review_rate', requiresReview ? 1 : 0);
}

function _percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function evaluateSlos() {
  if (!isSloMonitoringEnabled()) {
    return { enabled: false, slos: [] };
  }

  const results = [];

  for (const def of SLI_DEFINITIONS) {
    const arr = _samples.get(def.name) || [];
    const values = arr.map((s) => s.value);
    let current = null;
    let met = null;
    let burnRate = 0;

    if (def.name === 'api_availability' && values.length) {
      current = values.reduce((s, v) => s + v, 0) / values.length;
      met = current >= def.target;
      burnRate = met ? 0 : (def.target - current) / (1 - def.target);
    } else if (def.name === 'api_latency_p95' && values.length) {
      current = _percentile(values, 95);
      met = current <= def.target_ms;
      burnRate = met ? 0 : current / def.target_ms;
    } else if (def.name === 'outbox_lag_p95' && values.length) {
      current = _percentile(values, 95);
      met = current <= def.target_ms;
      burnRate = met ? 0 : current / def.target_ms;
    } else if (def.name === 'dlq_ingress_rate' && values.length) {
      const perMin = values.reduce((s, v) => s + v, 0) / Math.max(1, values.length / 60);
      current = perMin;
      met = perMin <= def.target_per_min;
      burnRate = met ? 0 : perMin / def.target_per_min;
    } else if (def.name === 'cognitive_pressure' && values.length) {
      current = values.reduce((s, v) => s + v, 0) / values.length;
      met = current <= def.target_max;
      burnRate = met ? 0 : current / def.target_max;
    } else if (
      (def.name === 'dashboard_latency_p95' ||
        def.name === 'ai_chat_latency_p95' ||
        def.name === 'sz5_query_latency_p95') &&
      values.length
    ) {
      current = _percentile(values, 95);
      met = current <= def.target_ms;
      burnRate = met ? 0 : current / def.target_ms;
    } else if (def.name === 'error_rate' && values.length) {
      current = values.reduce((s, v) => s + v, 0) / values.length;
      met = current <= def.target_max;
      burnRate = met ? 0 : current / def.target_max;
    } else if (def.name === 'ai_safety_review_rate' && values.length) {
      current = values.reduce((s, v) => s + v, 0) / values.length;
      met = current <= def.target_max;
      burnRate = met ? 0 : current / def.target_max;
    }

    if (current != null) {
      tenantMetrics.setGauge('impetus_slo_burn_rate', burnRate, { sli_name: def.name });
    }

    results.push({
      name: def.name,
      description: def.description,
      sample_count: values.length,
      current,
      met,
      burn_rate: burnRate != null ? Math.round(burnRate * 1000) / 1000 : null
    });
  }

  return { enabled: true, evaluated_at: new Date().toISOString(), slos: results };
}

module.exports = {
  SLI_DEFINITIONS,
  recordSliSample,
  recordHttpSli,
  recordOutboxLagSli,
  recordDlqSli,
  recordCognitivePressureSli,
  recordApmSli,
  recordAiSafetySli,
  evaluateSlos
};
