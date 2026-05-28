'use strict';

/**
 * PROMPT 14 — APM Enterprise Bridge
 *
 * OpenTelemetry-compatible spans + Prometheus metrics sem SDK no hot path.
 * Integra: enterpriseObservabilityRuntime, tenantMetricsRegistry, otlpExporter.
 *
 * Flags:
 *   IMPETUS_APM_ENTERPRISE_ENABLED (requer IMPETUS_OBSERVABILITY_V2_ENABLED)
 *   IMPETUS_APM_SHADOW_MODE (default true — métricas locais, sem pressão OTLP)
 *   IMPETUS_APM_SAMPLING_RATE (0.01–1.0, default 0.1)
 */

const flags = require('./observabilityFlags');

const DOMAINS = Object.freeze([
  'http',
  'dashboard',
  'ai_chat',
  'sz5',
  'governance',
  'hallucination',
  'lgpd',
  'runtime_health',
]);

let _stats = {
  spans_recorded: 0,
  spans_dropped_sampling: 0,
  spans_dropped_disabled: 0,
  metrics_recorded: 0,
};

function isApmEnterpriseEnabled() {
  return flags.isObservabilityV2Enabled() && flags.isApmEnterpriseEnabled();
}

function isApmShadowMode() {
  return flags.isApmShadowMode();
}

function shouldSample(opts = {}) {
  if (opts.force_sample === true) return true;
  const rate = flags.apmSamplingRate();
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  return Math.random() < rate;
}

function _log(event, data) {
  try {
    console.info('[APM_ENTERPRISE]', JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
  } catch { /* noop */ }
}

/**
 * Regista span distribuído + métricas Prometheus-style.
 * @param {string} operation — nome canónico (ex. dashboard.compose)
 * @param {number} durationMs
 * @param {object} attributes — domain, status, engine, etc.
 * @param {{ company_id?: string, force_sample?: boolean }} [opts]
 */
function recordSpan(operation, durationMs, attributes = {}, opts = {}) {
  if (!isApmEnterpriseEnabled()) {
    _stats.spans_dropped_disabled += 1;
    return { recorded: false, reason: 'disabled' };
  }

  if (!shouldSample(opts)) {
    _stats.spans_dropped_sampling += 1;
    return { recorded: false, reason: 'sampling' };
  }

  const domain = attributes.domain || 'runtime_health';
  const status = attributes.status || 'ok';
  const companyId = opts.company_id || attributes.company_id || null;

  _stats.spans_recorded += 1;

  let traceId = null;
  try {
    const obs = require('../services/operational/enterpriseObservabilityRuntime');
    const started = obs.startTrace(operation, { ...attributes, domain });
    traceId = started.traceId;
    if (traceId) obs.endTrace(traceId, status === 'error' ? 'error' : 'ok');
  } catch { /* non-blocking */ }

  try {
    const tenantMetrics = require('./tenantMetricsRegistry');
    tenantMetrics.incrementCounter(
      'impetus_apm_spans_total',
      1,
      { operation, domain, status },
      { company_id: companyId }
    );
    tenantMetrics.observeHistogram(
      'impetus_apm_span_duration_ms',
      durationMs,
      { operation, domain },
      { company_id: companyId }
    );
    _stats.metrics_recorded += 1;
  } catch { /* non-blocking */ }

  if (!isApmShadowMode() && flags.isOtelExporterEnabled()) {
    try {
      const otlp = require('./otlpExporter');
      const now = Date.now();
      otlp.enqueueTrace({
        traceId: traceId || `apm_${now}`,
        spanId: `sp_${Math.random().toString(36).slice(2, 10)}`,
        name: operation,
        startTime: now - durationMs,
        endTime: now,
        status,
        attributes: { ...attributes, duration_ms: durationMs },
      });
    } catch { /* non-blocking */ }
  }

  if (flags.isSloMonitoringEnabled()) {
    try {
      const slo = require('./sloSliRegistry');
      slo.recordApmSli(domain, durationMs, status);
    } catch { /* non-blocking */ }
  }

  return { recorded: true, trace_id: traceId, shadow: isApmShadowMode() };
}

function recordCounter(name, labels = {}, opts = {}) {
  if (!isApmEnterpriseEnabled()) return;
  try {
    const tenantMetrics = require('./tenantMetricsRegistry');
    tenantMetrics.incrementCounter(name, 1, labels, { company_id: opts.company_id });
    _stats.metrics_recorded += 1;
  } catch { /* noop */ }
}

function recordGauge(name, value, labels = {}, opts = {}) {
  if (!isApmEnterpriseEnabled()) return;
  try {
    const tenantMetrics = require('./tenantMetricsRegistry');
    tenantMetrics.setGauge(name, value, labels, { company_id: opts.company_id });
  } catch { /* noop */ }
}

function recordError(domain, errorType, opts = {}) {
  recordCounter('impetus_errors_total', { domain, error_type: errorType || 'unknown' }, opts);
}

function recordThroughput(domain, count = 1, opts = {}) {
  recordCounter('impetus_throughput_total', { domain }, { company_id: opts.company_id });
  if (count > 1) {
    try {
      const tenantMetrics = require('./tenantMetricsRegistry');
      tenantMetrics.incrementCounter('impetus_throughput_total', count - 1, { domain }, { company_id: opts.company_id });
    } catch { /* noop */ }
  }
}

/** Atalhos por domínio (hot paths PROMPT 14) */
function recordDashboardLatency(durationMs, attrs = {}, opts = {}) {
  return recordSpan('dashboard.engine_v2.compose', durationMs, { domain: 'dashboard', ...attrs }, opts);
}

function recordAiLatency(durationMs, attrs = {}, opts = {}) {
  return recordSpan('ai.chat.response', durationMs, { domain: 'ai_chat', ...attrs }, opts);
}

function recordSz5Latency(durationMs, attrs = {}, opts = {}) {
  return recordSpan('sz5.context.build', durationMs, { domain: 'sz5', ...attrs }, opts);
}

function recordGovernanceEvent(eventType, attrs = {}, opts = {}) {
  recordCounter('impetus_governance_events_total', { event_type: eventType }, opts);
  recordSpan(`governance.${eventType}`, attrs.duration_ms || 0, { domain: 'governance', ...attrs }, opts);
}

function recordHallucinationAssessment(assessment, opts = {}) {
  if (!assessment) return;
  recordGauge('impetus_ai_hallucination_confidence', assessment.confidence_score || 0, {}, opts);
  recordCounter(
    'impetus_ai_safety_flags_total',
    { severity: assessment.severity || 'INFO', requires_review: assessment.requires_human_review ? 'yes' : 'no' },
    opts
  );
}

function recordLgpdEvent(eventType, opts = {}) {
  recordCounter('impetus_lgpd_events_total', { event_type: eventType }, opts);
}

function recordRuntimeHealth(component, healthy, opts = {}) {
  recordGauge('impetus_runtime_health', healthy ? 1 : 0, { component }, opts);
}

function getDiagnostics() {
  const enterpriseMode = String(process.env.IMPETUS_APM_ENTERPRISE_MODE || 'shadow').trim().toLowerCase();
  return {
    enabled: isApmEnterpriseEnabled(),
    enterprise_mode: enterpriseMode,
    shadow_mode: isApmShadowMode(),
    sampling_rate: flags.apmSamplingRate(),
    otel_export: !isApmShadowMode() && flags.isOtelExporterEnabled(),
    otel_exporter_enabled: flags.isOtelExporterEnabled(),
    domains: DOMAINS,
    stats: { ..._stats },
  };
}

/**
 * Audit trail de boot/promoção (modo audit) — non-blocking, sem PII.
 */
async function emitBootAuditTrail() {
  if (!isApmEnterpriseEnabled()) return { emitted: false, reason: 'disabled' };

  const diag = getDiagnostics();
  _log('boot_audit', diag);

  try {
    const db = require('../db');
    await db.query(
      `INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
       VALUES ('apm_enterprise_boot', 'observability', $1, 'system:apm_enterprise', NOW(), NULL)`,
      [
        JSON.stringify({
          mode: diag.enterprise_mode,
          shadow_mode: diag.shadow_mode,
          sampling_rate: diag.sampling_rate,
          otel_export: diag.otel_export,
          otel_exporter_enabled: diag.otel_exporter_enabled,
          v2_enabled: flags.isObservabilityV2Enabled(),
          alerts_enforce: process.env.IMPETUS_OBSERVABILITY_ALERTS_ENFORCE === 'true',
        }),
      ]
    );
    return { emitted: true };
  } catch (err) {
    _log('boot_audit_error', { error: err?.message });
    return { emitted: false, error: err?.message };
  }
}

function exportPrometheusExtension() {
  if (!isApmEnterpriseEnabled()) return '';
  const lines = [
    '# HELP impetus_apm_enabled APM enterprise bridge active (1=yes)',
    '# TYPE impetus_apm_enabled gauge',
    `impetus_apm_enabled ${isApmEnterpriseEnabled() ? 1 : 0}`,
    '# HELP impetus_apm_shadow_mode Shadow mode suppresses OTLP export pressure',
    '# TYPE impetus_apm_shadow_mode gauge',
    `impetus_apm_shadow_mode ${isApmShadowMode() ? 1 : 0}`,
    '# HELP impetus_apm_sampling_rate Configured trace sampling rate',
    '# TYPE impetus_apm_sampling_rate gauge',
    `impetus_apm_sampling_rate ${flags.apmSamplingRate()}`,
    '# HELP impetus_apm_spans_recorded_total Spans recorded since boot',
    '# TYPE impetus_apm_spans_recorded_total counter',
    `impetus_apm_spans_recorded_total ${_stats.spans_recorded}`,
    '# HELP impetus_apm_spans_dropped_sampling_total Spans dropped by sampling',
    '# TYPE impetus_apm_spans_dropped_sampling_total counter',
    `impetus_apm_spans_dropped_sampling_total ${_stats.spans_dropped_sampling}`,
  ];
  return lines.join('\n') + '\n';
}

module.exports = {
  DOMAINS,
  isApmEnterpriseEnabled,
  isApmShadowMode,
  shouldSample,
  recordSpan,
  recordCounter,
  recordGauge,
  recordError,
  recordThroughput,
  recordDashboardLatency,
  recordAiLatency,
  recordSz5Latency,
  recordGovernanceEvent,
  recordHallucinationAssessment,
  recordLgpdEvent,
  recordRuntimeHealth,
  getDiagnostics,
  exportPrometheusExtension,
  emitBootAuditTrail,
};
