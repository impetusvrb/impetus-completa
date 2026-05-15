'use strict';

/**
 * IMPETUS — Cognitive Policy Engine · Fase 3 (Policy Signal Abstraction)
 * Camada universal de sinais cognitivos: schema, normalização, adapters e agregação só leitura.
 * Não invoca engines com efeitos laterais nem altera enforcement / runtime.
 * Rollout: IMPETUS_POLICY_SIGNALS_ENABLED=true
 */

const { randomUUID } = require('crypto');

const POLICY_SIGNAL_SEVERITY = Object.freeze({
  INFO: 'info',
  LOW: 'low',
  WARNING: 'warning',
  HIGH: 'high',
  CRITICAL: 'critical'
});

const POLICY_SIGNAL_CATEGORIES = Object.freeze({
  STABILITY: 'stability',
  SAFETY: 'safety',
  INTEGRITY: 'integrity',
  CONSENSUS: 'consensus',
  CALIBRATION: 'calibration',
  RUNTIME: 'runtime',
  GOVERNANCE: 'governance',
  TENANT: 'tenant',
  SECURITY: 'security',
  LEARNING: 'learning',
  AUTONOMY: 'autonomy'
});

/** Tipos semânticos universais (PSA). */
const POLICY_UNIVERSAL_SIGNAL_TYPES = Object.freeze({
  CSI: 'CSI',
  DRIFT: 'DRIFT',
  CONSENSUS: 'CONSENSUS',
  CALIBRATION: 'CALIBRATION',
  INTEGRITY: 'INTEGRITY',
  SAFETY: 'SAFETY',
  VOTING: 'VOTING',
  RUNTIME: 'RUNTIME'
});

const _ALLOWED_SEVERITY = new Set(Object.values(POLICY_SIGNAL_SEVERITY));
const _ALLOWED_CATEGORY = new Set(Object.values(POLICY_SIGNAL_CATEGORIES));
const _ALLOWED_TYPES = new Set(Object.values(POLICY_UNIVERSAL_SIGNAL_TYPES));

const ADAPTER_NAMES = Object.freeze([
  'adaptCsiSignal',
  'adaptDriftSignal',
  'adaptConsensusSignal',
  'adaptCalibrationSignal',
  'adaptIntegritySignal',
  'adaptSafetySignal',
  'adaptVotingSignal',
  'adaptRuntimeSignal'
]);

function isPolicySignalsEnabled() {
  return String(process.env.IMPETUS_POLICY_SIGNALS_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';
}

function _nowIso() {
  return new Date().toISOString();
}

function _safeStr(v, max = 512) {
  if (v == null) return '';
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

function _clamp01(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Padroniza valores heterogéneos para escala 0–1 (e severidades textuais).
 * Sem throw — fallback 0.
 * @param {unknown} raw
 * @returns {{ normalized: number, hint: string }}
 */
function normalizeSignalValue(raw) {
  let normalized = 0;
  let hint = 'empty';
  try {
    if (raw == null) {
      hint = 'null';
    } else if (typeof raw === 'boolean') {
      normalized = raw ? 1 : 0;
      hint = 'boolean';
    } else if (typeof raw === 'number' && Number.isFinite(raw)) {
      if (raw >= 0 && raw <= 1) {
        normalized = raw;
        hint = 'unit_interval';
      } else if (raw > 1 && raw <= 100) {
        normalized = _clamp01(raw / 100);
        hint = 'percent_scale';
      } else if (raw > 100) {
        normalized = 1;
        hint = 'capped_above_100';
      } else {
        normalized = 0;
        hint = 'negative_or_nan';
      }
    } else if (typeof raw === 'string') {
      const t = raw.trim().toLowerCase();
      if (t === 'critical' || t === 'crit') {
        normalized = 1;
        hint = 'severity_text_critical';
      } else if (t === 'warning' || t === 'warn') {
        normalized = 0.5;
        hint = 'severity_text_warning';
      } else if (t === 'high') {
        normalized = 0.75;
        hint = 'severity_text_high';
      } else if (t === 'low') {
        normalized = 0.25;
        hint = 'severity_text_low';
      } else if (t === 'info' || t === 'healthy' || t === 'stable' || t === 'safe') {
        normalized = 0.1;
        hint = 'severity_text_low_info';
      } else if (t.endsWith('%')) {
        const n = Number(t.slice(0, -1));
        if (Number.isFinite(n)) {
          normalized = _clamp01(n / 100);
          hint = 'percent_string';
        }
      } else {
        const n = Number(t);
        if (Number.isFinite(n)) {
          const inner = normalizeSignalValue(n);
          normalized = inner.normalized;
          hint = `string_number:${inner.hint}`;
        }
      }
    }
  } catch (_e) {
    normalized = 0;
    hint = 'exception_fallback';
  }
  normalized = _clamp01(normalized);
  try {
    console.info('[POLICY_SIGNAL_NORMALIZED]', JSON.stringify({ normalized, hint }));
  } catch (_e2) {}
  return { normalized, hint };
}

function _normalizeSeverity(raw) {
  const s = _safeStr(raw, 32).trim().toLowerCase();
  if (_ALLOWED_SEVERITY.has(s)) return s;
  if (s === 'stable' || s === 'healthy') return POLICY_SIGNAL_SEVERITY.INFO;
  if (s === 'warn') return POLICY_SIGNAL_SEVERITY.WARNING;
  if (s === 'crit') return POLICY_SIGNAL_SEVERITY.CRITICAL;
  return POLICY_SIGNAL_SEVERITY.INFO;
}

function _normalizeCategory(raw) {
  const s = _safeStr(raw, 48).trim().toLowerCase();
  if (_ALLOWED_CATEGORY.has(s)) return s;
  return POLICY_SIGNAL_CATEGORIES.RUNTIME;
}

function _confidenceFrom(raw) {
  if (raw == null) return null;
  const { normalized } = normalizeSignalValue(raw.confidence != null ? raw.confidence : raw);
  if (normalized === 0 && raw.confidence == null) return null;
  return normalized;
}

/**
 * @param {Record<string, unknown>} [partial]
 * @returns {Record<string, unknown>}
 */
function createPolicySignal(partial) {
  let p = {};
  try {
    p = partial && typeof partial === 'object' ? { ...partial } : {};
  } catch (_e) {
    p = {};
  }

  const signal_id = p.signal_id != null ? _safeStr(p.signal_id, 64) : randomUUID();
  const signal_type = _ALLOWED_TYPES.has(_safeStr(p.signal_type, 32).toUpperCase())
    ? String(p.signal_type).toUpperCase()
    : POLICY_UNIVERSAL_SIGNAL_TYPES.RUNTIME;

  const valueRaw = p.value != null ? p.value : 0;
  let value = 0;
  if (typeof valueRaw === 'number' && Number.isFinite(valueRaw)) value = valueRaw;
  else if (typeof valueRaw === 'string' && valueRaw.trim() !== '') {
    const n = Number(valueRaw);
    if (Number.isFinite(n)) value = n;
  }

  const { normalized: normalized_value } = normalizeSignalValue(
    p.normalized_value != null ? p.normalized_value : value !== 0 ? value : p.severity
  );

  const severity = _normalizeSeverity(p.severity != null ? p.severity : p.status);
  const source = _safeStr(p.source, 128) || 'unknown';
  const category = _normalizeCategory(p.category);
  const confidence = _confidenceFrom(p);

  const tenant_scope = _safeStr(p.tenant_scope, 128) || 'unspecified';
  const runtime_scope = _safeStr(p.runtime_scope, 128) || 'unspecified';
  const trace_id = p.trace_id != null ? _safeStr(p.trace_id, 128) : randomUUID();

  let metadata = {};
  try {
    if (p.metadata != null && typeof p.metadata === 'object' && !Array.isArray(p.metadata)) {
      metadata = { ...p.metadata };
    }
  } catch (_e2) {
    metadata = {};
  }
  if (!Array.isArray(metadata.signal_trace)) metadata.signal_trace = [];

  const generated_at = p.generated_at != null ? _safeStr(p.generated_at, 40) : _nowIso();

  const out = {
    signal_id,
    signal_type,
    severity,
    value,
    normalized_value,
    source,
    category,
    confidence,
    tenant_scope,
    runtime_scope,
    trace_id,
    metadata,
    generated_at
  };

  try {
    console.info(
      '[POLICY_SIGNAL]',
      JSON.stringify({
        action: 'create',
        signal_type: out.signal_type,
        severity: out.severity,
        normalized: out.normalized_value
      })
    );
  } catch (_e3) {}
  return out;
}

function _mapSeverityToValueForCsi(status) {
  return normalizeSignalValue(status).normalized;
}

function adaptCsiSignal(raw, ctx = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const value = r.csi != null ? Number(r.csi) : r.score != null ? Number(r.score) : r.value != null ? Number(r.value) : 0;
  const sev = r.status != null ? r.status : r.severity != null ? r.severity : r.unavailable ? 'warning' : 'info';
  const nv =
    r.normalized_value != null
      ? normalizeSignalValue(r.normalized_value).normalized
      : Number.isFinite(value) && value > 1
        ? normalizeSignalValue(value).normalized
        : Number.isFinite(value)
          ? normalizeSignalValue(value / 100).normalized
          : _mapSeverityToValueForCsi(sev);

  const sig = createPolicySignal({
    signal_type: POLICY_UNIVERSAL_SIGNAL_TYPES.CSI,
    value: Number.isFinite(value) ? value : 0,
    normalized_value: nv,
    severity: sev,
    source: 'cognitiveStabilityService',
    category: POLICY_SIGNAL_CATEGORIES.STABILITY,
    tenant_scope: ctx.tenant_scope || 'company_id',
    runtime_scope: ctx.runtime_scope || 'dashboard_chat',
    confidence: r.confidence,
    trace_id: ctx.trace_id,
    metadata: { raw_keys: Object.keys(r).slice(0, 24) }
  });
  try {
    console.info('[POLICY_SIGNAL_ADAPTER]', JSON.stringify({ adapter: 'adaptCsiSignal', source: 'cognitiveStabilityService' }));
  } catch (_e) {}
  return appendSignalTrace(sig, {
    adapter: 'adaptCsiSignal',
    source: 'cognitiveStabilityService',
    transformation: 'csi_engine_payload_to_universal'
  });
}

function adaptDriftSignal(raw, ctx = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const value = r.recent_drift_events != null ? Number(r.recent_drift_events) : r.drift_score != null ? Number(r.drift_score) : 0;
  const sev =
    r.high_severity > 0
      ? POLICY_SIGNAL_SEVERITY.HIGH
      : r.recent_drift_events > 5
        ? POLICY_SIGNAL_SEVERITY.WARNING
        : POLICY_SIGNAL_SEVERITY.INFO;

  const sig = createPolicySignal({
    signal_type: POLICY_UNIVERSAL_SIGNAL_TYPES.DRIFT,
    value: Number.isFinite(value) ? value : 0,
    normalized_value: normalizeSignalValue(Math.min(1, value / 20)).normalized,
    severity: sev,
    source: 'cognitiveDriftService',
    category: POLICY_SIGNAL_CATEGORIES.GOVERNANCE,
    tenant_scope: ctx.tenant_scope || 'company_id',
    runtime_scope: ctx.runtime_scope || 'dashboard_chat',
    metadata: { last_drift_at: r.last_drift_at || null }
  });
  try {
    console.info('[POLICY_SIGNAL_ADAPTER]', JSON.stringify({ adapter: 'adaptDriftSignal', source: 'cognitiveDriftService' }));
  } catch (_e) {}
  return appendSignalTrace(sig, {
    adapter: 'adaptDriftSignal',
    source: 'cognitiveDriftService',
    transformation: 'drift_counters_to_universal'
  });
}

function adaptConsensusSignal(raw, ctx = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const score = r.consensus_score != null ? Number(r.consensus_score) : 0.5;
  const sev =
    r.divergence_events > 3 ? POLICY_SIGNAL_SEVERITY.WARNING : POLICY_SIGNAL_SEVERITY.INFO;
  const sig = createPolicySignal({
    signal_type: POLICY_UNIVERSAL_SIGNAL_TYPES.CONSENSUS,
    value: Number.isFinite(score) ? score : 0,
    normalized_value: normalizeSignalValue(score).normalized,
    severity: sev,
    source: 'cognitiveConsensusService',
    category: POLICY_SIGNAL_CATEGORIES.CONSENSUS,
    tenant_scope: ctx.tenant_scope || 'company_id',
    runtime_scope: ctx.runtime_scope || 'dashboard_chat',
    metadata: { divergence_events: r.divergence_events }
  });
  try {
    console.info('[POLICY_SIGNAL_ADAPTER]', JSON.stringify({ adapter: 'adaptConsensusSignal', source: 'cognitiveConsensusService' }));
  } catch (_e) {}
  return appendSignalTrace(sig, {
    adapter: 'adaptConsensusSignal',
    source: 'cognitiveConsensusService',
    transformation: 'consensus_score_to_universal'
  });
}

function adaptCalibrationSignal(raw, ctx = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const oc = r.overconfidence_events != null ? Number(r.overconfidence_events) : 0;
  const sev = oc > 5 ? POLICY_SIGNAL_SEVERITY.WARNING : POLICY_SIGNAL_SEVERITY.INFO;
  const sig = createPolicySignal({
    signal_type: POLICY_UNIVERSAL_SIGNAL_TYPES.CALIBRATION,
    value: oc,
    normalized_value: normalizeSignalValue(Math.min(1, oc / 10)).normalized,
    severity: sev,
    source: 'confidenceCalibrationService',
    category: POLICY_SIGNAL_CATEGORIES.CALIBRATION,
    tenant_scope: ctx.tenant_scope || 'company_id',
    runtime_scope: ctx.runtime_scope || 'dashboard_chat',
    metadata: { underconfidence_events: r.underconfidence_events }
  });
  try {
    console.info('[POLICY_SIGNAL_ADAPTER]', JSON.stringify({ adapter: 'adaptCalibrationSignal', source: 'confidenceCalibrationService' }));
  } catch (_e) {}
  return appendSignalTrace(sig, {
    adapter: 'adaptCalibrationSignal',
    source: 'confidenceCalibrationService',
    transformation: 'calibration_counters_to_universal'
  });
}

function adaptIntegritySignal(raw, ctx = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const failures = r.integrity_failures != null ? Number(r.integrity_failures) : 0;
  const sev =
    r.status === 'critical'
      ? POLICY_SIGNAL_SEVERITY.CRITICAL
      : r.status === 'warning'
        ? POLICY_SIGNAL_SEVERITY.WARNING
        : POLICY_SIGNAL_SEVERITY.INFO;
  const sig = createPolicySignal({
    signal_type: POLICY_UNIVERSAL_SIGNAL_TYPES.INTEGRITY,
    value: failures,
    normalized_value: normalizeSignalValue(Math.min(1, failures / 5)).normalized,
    severity: sev,
    source: 'contextIntegrityService',
    category: POLICY_SIGNAL_CATEGORIES.INTEGRITY,
    tenant_scope: ctx.tenant_scope || 'company_id',
    runtime_scope: ctx.runtime_scope || 'dashboard_chat',
    metadata: { block_mode: !!r.block_mode }
  });
  try {
    console.info('[POLICY_SIGNAL_ADAPTER]', JSON.stringify({ adapter: 'adaptIntegritySignal', source: 'contextIntegrityService' }));
  } catch (_e) {}
  return appendSignalTrace(sig, {
    adapter: 'adaptIntegritySignal',
    source: 'contextIntegrityService',
    transformation: 'integrity_status_to_universal'
  });
}

function adaptSafetySignal(raw, ctx = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const rs = r.risk_score != null ? Number(r.risk_score) : 0;
  const sevRaw = r.risk_level || r.severity || POLICY_SIGNAL_SEVERITY.INFO;
  const sig = createPolicySignal({
    signal_type: POLICY_UNIVERSAL_SIGNAL_TYPES.SAFETY,
    value: Number.isFinite(rs) ? rs : 0,
    normalized_value: normalizeSignalValue(Number.isFinite(rs) ? rs : sevRaw).normalized,
    severity: sevRaw,
    source: 'cognitiveSafetyRuntimeService',
    category: POLICY_SIGNAL_CATEGORIES.SAFETY,
    tenant_scope: ctx.tenant_scope || 'company_id',
    runtime_scope: ctx.runtime_scope || 'dashboard_chat',
    metadata: { engine_enabled: !!r.engine_enabled }
  });
  try {
    console.info('[POLICY_SIGNAL_ADAPTER]', JSON.stringify({ adapter: 'adaptSafetySignal', source: 'cognitiveSafetyRuntimeService' }));
  } catch (_e) {}
  return appendSignalTrace(sig, {
    adapter: 'adaptSafetySignal',
    source: 'cognitiveSafetyRuntimeService',
    transformation: 'safety_risk_to_universal'
  });
}

function adaptVotingSignal(raw, ctx = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const wc = r.weighted_consensus != null ? Number(r.weighted_consensus) : 0;
  const sev = r.dominant_engine ? POLICY_SIGNAL_SEVERITY.WARNING : POLICY_SIGNAL_SEVERITY.INFO;
  const sig = createPolicySignal({
    signal_type: POLICY_UNIVERSAL_SIGNAL_TYPES.VOTING,
    value: Number.isFinite(wc) ? wc : 0,
    normalized_value: normalizeSignalValue(wc).normalized,
    severity: sev,
    source: 'cognitiveVotingService',
    category: POLICY_SIGNAL_CATEGORIES.CONSENSUS,
    tenant_scope: ctx.tenant_scope || 'company_id',
    runtime_scope: ctx.runtime_scope || 'dashboard_chat',
    metadata: { dominant_engine: r.dominant_engine || null }
  });
  try {
    console.info('[POLICY_SIGNAL_ADAPTER]', JSON.stringify({ adapter: 'adaptVotingSignal', source: 'cognitiveVotingService' }));
  } catch (_e) {}
  return appendSignalTrace(sig, {
    adapter: 'adaptVotingSignal',
    source: 'cognitiveVotingService',
    transformation: 'weighted_voting_to_universal'
  });
}

function adaptRuntimeSignal(raw, ctx = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const flags = [
    r.drift_detection,
    r.replay,
    r.autonomy,
    r.consensus_engine,
    r.calibration_engine,
    r.csi_enabled,
    r.cognitive_safety,
    r.weighted_voting
  ].filter((x) => x === true).length;
  const sig = createPolicySignal({
    signal_type: POLICY_UNIVERSAL_SIGNAL_TYPES.RUNTIME,
    value: flags,
    normalized_value: normalizeSignalValue(flags / 8).normalized,
    severity: flags >= 6 ? POLICY_SIGNAL_SEVERITY.LOW : POLICY_SIGNAL_SEVERITY.INFO,
    source: 'governance_runtime_flags',
    category: POLICY_SIGNAL_CATEGORIES.RUNTIME,
    tenant_scope: ctx.tenant_scope || 'company_id',
    runtime_scope: ctx.runtime_scope || 'dashboard_chat',
    metadata: {
      drift_detection: !!r.drift_detection,
      replay: !!r.replay,
      autonomy: !!r.autonomy,
      consensus_engine: !!r.consensus_engine,
      calibration_engine: !!r.calibration_engine,
      csi_enabled: !!r.csi_enabled,
      cognitive_safety: !!r.cognitive_safety,
      weighted_voting: !!r.weighted_voting,
      strategic_learning: !!r.strategic_learning
    }
  });
  try {
    console.info('[POLICY_SIGNAL_ADAPTER]', JSON.stringify({ adapter: 'adaptRuntimeSignal', source: 'governance_runtime_flags' }));
  } catch (_e) {}
  return appendSignalTrace(sig, {
    adapter: 'adaptRuntimeSignal',
    source: 'governance_runtime_flags',
    transformation: 'runtime_flags_to_universal'
  });
}

/**
 * @param {unknown[]} list
 * @returns {{ signals: unknown[], summary: Record<string, number> }}
 */
function aggregatePolicySignals(list) {
  const signals = Array.isArray(list) ? list.filter((s) => s && typeof s === 'object') : [];
  const summary = {
    info: 0,
    low: 0,
    warning: 0,
    high: 0,
    critical: 0
  };
  for (const s of signals) {
    const sev = _normalizeSeverity(s.severity);
    if (summary[sev] != null) summary[sev] += 1;
  }
  try {
    console.info('[POLICY_SIGNAL]', JSON.stringify({ action: 'aggregate', count: signals.length }));
  } catch (_e) {}
  return { signals, summary };
}

/**
 * @param {Record<string, unknown>} signal
 * @param {Record<string, unknown>} entry adapter, source, transformation, trace_id
 */
function appendSignalTrace(signal, entry) {
  const base = signal && typeof signal === 'object' ? { ...signal } : createPolicySignal({});
  const meta =
    base.metadata && typeof base.metadata === 'object' && !Array.isArray(base.metadata)
      ? { ...base.metadata }
      : {};
  const trace = Array.isArray(meta.signal_trace) ? [...meta.signal_trace] : [];
  const step = {
    adapter: _safeStr(entry && entry.adapter, 64) || 'unknown',
    source: _safeStr(entry && entry.source, 128) || 'unknown',
    transformation: _safeStr(entry && entry.transformation, 256) || '',
    trace_id: entry && entry.trace_id != null ? _safeStr(entry.trace_id, 128) : base.trace_id,
    timestamp: _nowIso()
  };
  trace.push(step);
  meta.signal_trace = trace;
  const out = { ...base, metadata: meta };
  try {
    console.info('[POLICY_SIGNAL_TRACE]', JSON.stringify({ adapter: step.adapter, source: step.source }));
  } catch (_e) {}
  return out;
}

/**
 * @param {Record<string, unknown>} signal
 * @returns {{ valid: boolean, errors: { path: string, message: string }[] }}
 */
function validatePolicySignal(signal) {
  const errors = [];
  try {
    if (!signal || typeof signal !== 'object') {
      errors.push({ path: '', message: 'signal_missing' });
    } else {
      if (!_safeStr(signal.signal_id, 80)) errors.push({ path: 'signal_id', message: 'required' });
      if (!_ALLOWED_TYPES.has(_safeStr(signal.signal_type, 32).toUpperCase())) {
        errors.push({ path: 'signal_type', message: 'invalid_type' });
      }
      const sevRaw = String(signal.severity != null ? signal.severity : '').trim().toLowerCase();
      if (!_ALLOWED_SEVERITY.has(sevRaw)) {
        errors.push({ path: 'severity', message: 'invalid_severity' });
      }
      if (!_ALLOWED_CATEGORY.has(_normalizeCategory(signal.category))) {
        errors.push({ path: 'category', message: 'invalid_category' });
      }
      const nv = signal.normalized_value;
      if (typeof nv !== 'number' || !Number.isFinite(nv) || nv < 0 || nv > 1) {
        errors.push({ path: 'normalized_value', message: 'must_be_unit_interval' });
      }
      if (typeof signal.value !== 'number' || !Number.isFinite(signal.value)) {
        errors.push({ path: 'value', message: 'must_be_number' });
      }
      if (!_safeStr(signal.generated_at, 48)) errors.push({ path: 'generated_at', message: 'required_iso' });
    }
  } catch (e) {
    errors.push({ path: '', message: _safeStr(e && e.message, 200) || 'validation_exception' });
  }
  const valid = errors.length === 0;
  return { valid, errors };
}

function generatePolicySignalSnapshot() {
  return {
    generated_at: _nowIso(),
    categories: [...Object.values(POLICY_SIGNAL_CATEGORIES)],
    signal_types: [...Object.values(POLICY_UNIVERSAL_SIGNAL_TYPES)],
    severity_levels: [...Object.values(POLICY_SIGNAL_SEVERITY)],
    adapters: [...ADAPTER_NAMES]
  };
}

function _buildDemoSignals() {
  const ctx = { tenant_scope: 'company_id', runtime_scope: 'dashboard_chat' };
  return [
    adaptCsiSignal({ csi: 62, status: 'warning', unavailable: false }, ctx),
    adaptDriftSignal({ recent_drift_events: 4, high_severity: 0, last_drift_at: null }, ctx),
    adaptConsensusSignal({ consensus_score: 0.82, divergence_events: 1 }, ctx),
    adaptCalibrationSignal({ overconfidence_events: 2, underconfidence_events: 0 }, ctx),
    adaptIntegritySignal({ integrity_failures: 0, status: 'healthy', block_mode: false }, ctx),
    adaptSafetySignal({ risk_score: 0.35, risk_level: 'warning', engine_enabled: true }, ctx),
    adaptVotingSignal({ weighted_consensus: 0.9, dominant_engine: null, engine_enabled: true }, ctx),
    adaptRuntimeSignal(
      {
        drift_detection: true,
        replay: false,
        autonomy: true,
        consensus_engine: true,
        calibration_engine: false,
        csi_enabled: true,
        cognitive_safety: true,
        weighted_voting: false
      },
      ctx
    )
  ];
}

/** Resumo para GET /dashboard (leitura). */
function getPolicySignalDashboardSummary() {
  if (!isPolicySignalsEnabled()) {
    return {
      enabled: false,
      code: 'POLICY_SIGNALS_DISABLED',
      message: 'Defina IMPETUS_POLICY_SIGNALS_ENABLED=true para a camada PSA (sinais universais).'
    };
  }
  const snap = generatePolicySignalSnapshot();
  const demo = _buildDemoSignals();
  const { summary } = aggregatePolicySignals(demo);
  const validated = demo.filter((s) => validatePolicySignal(s).valid);
  return {
    enabled: true,
    generated_at: snap.generated_at,
    category_count: snap.categories.length,
    signal_type_count: snap.signal_types.length,
    severity_level_count: snap.severity_levels.length,
    adapter_count: snap.adapters.length,
    demo_signal_count: demo.length,
    demo_validated_count: validated.length,
    aggregate_summary: summary,
    normalized_signals_preview: demo.slice(0, 3).map((s) => ({
      signal_type: s.signal_type,
      severity: s.severity,
      normalized_value: s.normalized_value
    }))
  };
}

/** Payload completo para GET /policy-signals (só leitura). */
function generatePolicySignalsAdminPayload() {
  const snapshot = generatePolicySignalSnapshot();
  const demo = _buildDemoSignals();
  const aggregated = aggregatePolicySignals(demo);
  return {
    snapshot,
    reference_signals: demo,
    aggregated
  };
}

module.exports = {
  POLICY_SIGNAL_SEVERITY,
  POLICY_SIGNAL_CATEGORIES,
  POLICY_UNIVERSAL_SIGNAL_TYPES,
  ADAPTER_NAMES,
  isPolicySignalsEnabled,
  normalizeSignalValue,
  createPolicySignal,
  adaptCsiSignal,
  adaptDriftSignal,
  adaptConsensusSignal,
  adaptCalibrationSignal,
  adaptIntegritySignal,
  adaptSafetySignal,
  adaptVotingSignal,
  adaptRuntimeSignal,
  aggregatePolicySignals,
  appendSignalTrace,
  validatePolicySignal,
  generatePolicySignalSnapshot,
  getPolicySignalDashboardSummary,
  generatePolicySignalsAdminPayload
};
