'use strict';

/**
 * IMPETUS — Continuous Validation Engine (Consolidação F5)
 *
 * Valida comportamento cognitivo real continuamente:
 * drift, hallucination, regression, instability, governance violations.
 *
 * Temporal Benchmarking: compara modelos (GPT, Claude, Gemini, Ensemble).
 *
 * Feature flag: IMPETUS_CONTINUOUS_VALIDATION_ENABLED (default: true)
 */

const { v4: uuidv4 } = require('uuid');

const VALIDATION_ENABLED = process.env.IMPETUS_CONTINUOUS_VALIDATION_ENABLED !== 'false';

const VALIDATION_TYPES = Object.freeze({
  DRIFT: 'drift',
  HALLUCINATION: 'hallucination',
  REGRESSION: 'regression',
  INSTABILITY: 'instability',
  GOVERNANCE_VIOLATION: 'governance_violation',
  CONFIDENCE_ANOMALY: 'confidence_anomaly',
  LATENCY_SPIKE: 'latency_spike'
});

const SEVERITY_LEVELS = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  HIGH: 'high',
  CRITICAL: 'critical'
});

const _validationResults = [];
const _temporalBenchmarks = [];
const _violations = [];
const MAX_RESULTS = 5000;
const MAX_BENCHMARKS = 2000;
const MAX_VIOLATIONS = 1000;

let _validationsRun = 0;
let _violationsDetected = 0;
let _benchmarksRun = 0;

/**
 * Validação individual de um output cognitivo.
 */
function validate(input, output, context = {}) {
  if (!VALIDATION_ENABLED) return { validated: false, reason: 'disabled' };

  _validationsRun++;
  const result = {
    validation_id: uuidv4(),
    timestamp: new Date().toISOString(),
    checks: [],
    overall_valid: true,
    violations: [],
    company_id: context.company_id || null,
    model: context.model || null
  };

  result.checks.push(_checkDrift(output, context));
  result.checks.push(_checkHallucination(output, context));
  result.checks.push(_checkRegression(output, context));
  result.checks.push(_checkInstability(output, context));
  result.checks.push(_checkGovernanceCompliance(output, context));
  result.checks.push(_checkConfidenceAnomaly(output, context));
  result.checks.push(_checkLatencySpike(output, context));

  const failedChecks = result.checks.filter(c => !c.passed);
  result.overall_valid = failedChecks.length === 0;
  result.violations = failedChecks.map(c => ({
    type: c.type,
    severity: c.severity,
    message: c.message
  }));

  if (result.violations.length > 0) {
    _violationsDetected += result.violations.length;
    for (const v of result.violations) {
      _violations.push({ ...v, validation_id: result.validation_id, timestamp: result.timestamp });
    }
    if (_violations.length > MAX_VIOLATIONS) _violations.splice(0, _violations.length - MAX_VIOLATIONS);
  }

  _validationResults.push(result);
  if (_validationResults.length > MAX_RESULTS) _validationResults.splice(0, _validationResults.length - MAX_RESULTS);

  return result;
}

function _checkDrift(output, context) {
  const baseline = context.baseline_confidence || 0.8;
  const current = output.confidence || 0;
  const drift = Math.abs(current - baseline);

  return {
    type: VALIDATION_TYPES.DRIFT,
    passed: drift < 0.2,
    severity: drift >= 0.3 ? SEVERITY_LEVELS.CRITICAL : drift >= 0.2 ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.INFO,
    message: drift >= 0.2 ? `Drift cognitivo: ${(drift * 100).toFixed(1)}% da baseline` : 'Drift dentro do esperado',
    value: Math.round(drift * 10000) / 10000
  };
}

function _checkHallucination(output, context) {
  const indicators = [];

  if (output.confidence != null && output.confidence < 0.3 && output.content_length > 200) {
    indicators.push('low_confidence_long_response');
  }
  if (output.sources_cited === 0 && output.claims_count > 3) {
    indicators.push('claims_without_sources');
  }
  if (output.contradictions_detected) {
    indicators.push('contradictions');
  }

  return {
    type: VALIDATION_TYPES.HALLUCINATION,
    passed: indicators.length === 0,
    severity: indicators.length >= 2 ? SEVERITY_LEVELS.CRITICAL : indicators.length === 1 ? SEVERITY_LEVELS.WARNING : SEVERITY_LEVELS.INFO,
    message: indicators.length > 0 ? `Indicadores de hallucination: ${indicators.join(', ')}` : 'Sem indicadores de hallucination',
    indicators
  };
}

function _checkRegression(output, context) {
  const previousQuality = context.previous_quality || null;
  const currentQuality = output.quality_score || null;

  if (previousQuality == null || currentQuality == null) {
    return { type: VALIDATION_TYPES.REGRESSION, passed: true, severity: SEVERITY_LEVELS.INFO, message: 'Dados insuficientes para detecção de regressão' };
  }

  const delta = currentQuality - previousQuality;

  return {
    type: VALIDATION_TYPES.REGRESSION,
    passed: delta >= -0.1,
    severity: delta < -0.2 ? SEVERITY_LEVELS.CRITICAL : delta < -0.1 ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.INFO,
    message: delta < -0.1 ? `Regressão de qualidade: ${(delta * 100).toFixed(1)}%` : 'Sem regressão detectada',
    delta: Math.round(delta * 10000) / 10000
  };
}

function _checkInstability(output, context) {
  const recentOutputs = context.recent_outputs || [];
  if (recentOutputs.length < 3) {
    return { type: VALIDATION_TYPES.INSTABILITY, passed: true, severity: SEVERITY_LEVELS.INFO, message: 'Dados insuficientes' };
  }

  const confidences = recentOutputs.map(o => o.confidence || 0);
  const mean = confidences.reduce((s, v) => s + v, 0) / confidences.length;
  const variance = confidences.reduce((s, v) => s + (v - mean) ** 2, 0) / confidences.length;
  const stddev = Math.sqrt(variance);

  return {
    type: VALIDATION_TYPES.INSTABILITY,
    passed: stddev < 0.15,
    severity: stddev >= 0.25 ? SEVERITY_LEVELS.CRITICAL : stddev >= 0.15 ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.INFO,
    message: stddev >= 0.15 ? `Instabilidade cognitiva: stddev ${(stddev * 100).toFixed(1)}%` : 'Estável',
    stddev: Math.round(stddev * 10000) / 10000
  };
}

function _checkGovernanceCompliance(output, context) {
  const violations = [];

  if (output.bypassed_governance === true) violations.push('governance_bypassed');
  if (output.policy_violations && output.policy_violations.length > 0) {
    violations.push(...output.policy_violations.map(v => `policy:${v}`));
  }
  if (output.no_audit_trail === true) violations.push('missing_audit_trail');

  return {
    type: VALIDATION_TYPES.GOVERNANCE_VIOLATION,
    passed: violations.length === 0,
    severity: violations.length >= 2 ? SEVERITY_LEVELS.CRITICAL : violations.length === 1 ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.INFO,
    message: violations.length > 0 ? `Violações: ${violations.join(', ')}` : 'Governance compliance OK',
    violations
  };
}

function _checkConfidenceAnomaly(output, context) {
  const confidence = output.confidence || 0;
  const anomaly = confidence > 0.99 || (confidence < 0.1 && output.content_length > 100);

  return {
    type: VALIDATION_TYPES.CONFIDENCE_ANOMALY,
    passed: !anomaly,
    severity: anomaly ? SEVERITY_LEVELS.WARNING : SEVERITY_LEVELS.INFO,
    message: anomaly ? `Confiança anômala: ${confidence}` : 'Confiança normal',
    confidence
  };
}

function _checkLatencySpike(output, context) {
  const latency = output.latency_ms || 0;
  const threshold = context.latency_threshold_ms || 5000;
  const spike = latency > threshold;

  return {
    type: VALIDATION_TYPES.LATENCY_SPIKE,
    passed: !spike,
    severity: latency > threshold * 2 ? SEVERITY_LEVELS.CRITICAL : spike ? SEVERITY_LEVELS.WARNING : SEVERITY_LEVELS.INFO,
    message: spike ? `Latência elevada: ${latency}ms (threshold: ${threshold}ms)` : 'Latência normal',
    latency_ms: latency
  };
}

/**
 * Temporal Benchmarking (F5.2)
 */
function recordBenchmark(model, metrics = {}) {
  _benchmarksRun++;
  const benchmark = {
    benchmark_id: uuidv4(),
    model: model || 'unknown',
    precision: metrics.precision != null ? metrics.precision : null,
    coherence: metrics.coherence != null ? metrics.coherence : null,
    latency_ms: metrics.latency_ms || null,
    stability: metrics.stability != null ? metrics.stability : null,
    timestamp: new Date().toISOString()
  };

  _temporalBenchmarks.push(benchmark);
  if (_temporalBenchmarks.length > MAX_BENCHMARKS) {
    _temporalBenchmarks.splice(0, _temporalBenchmarks.length - MAX_BENCHMARKS);
  }

  return benchmark;
}

function getTemporalComparison(opts = {}) {
  const window = opts.window || 100;
  const recent = _temporalBenchmarks.slice(-window);
  const models = new Map();

  for (const b of recent) {
    if (!models.has(b.model)) models.set(b.model, []);
    models.get(b.model).push(b);
  }

  const comparison = [];
  for (const [model, benchmarks] of models) {
    const avg = (key) => {
      const vals = benchmarks.filter(b => b[key] != null).map(b => b[key]);
      return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 1000) / 1000 : null;
    };
    comparison.push({
      model,
      samples: benchmarks.length,
      avg_precision: avg('precision'),
      avg_coherence: avg('coherence'),
      avg_latency_ms: avg('latency_ms'),
      avg_stability: avg('stability')
    });
  }

  comparison.sort((a, b) => (b.avg_precision || 0) - (a.avg_precision || 0));
  return { comparison, window, total_benchmarks: recent.length };
}

function getRecentViolations(limit = 50) {
  return _violations.slice(-Math.min(limit, 300));
}

function getValidationStats() {
  const recent = _validationResults.slice(-100);
  const valid = recent.filter(r => r.overall_valid).length;
  return {
    total: recent.length,
    valid,
    invalid: recent.length - valid,
    validity_rate: recent.length ? Math.round(valid / recent.length * 10000) / 100 : 0
  };
}

function getMetrics() {
  return {
    validations_run: _validationsRun,
    violations_detected: _violationsDetected,
    benchmarks_run: _benchmarksRun,
    validation_stats: getValidationStats(),
    validation_enabled: VALIDATION_ENABLED
  };
}

function getHealth() {
  const stats = getValidationStats();
  return {
    status: !VALIDATION_ENABLED ? 'disabled'
      : stats.validity_rate < 70 ? 'degraded'
      : 'healthy',
    metrics: getMetrics()
  };
}

module.exports = {
  VALIDATION_TYPES,
  SEVERITY_LEVELS,
  VALIDATION_ENABLED,
  validate,
  recordBenchmark,
  getTemporalComparison,
  getRecentViolations,
  getValidationStats,
  getMetrics,
  getHealth
};
