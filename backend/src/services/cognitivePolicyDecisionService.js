'use strict';

/**
 * IMPETUS — Cognitive Policy Engine · Fase 2 (Policy Decision Contract)
 * Contrato normativo unificado: schema, normalização, validação e trace observável.
 * Não executa efeitos, não altera gateway/safety/orchestrator nem policyEngineService.
 * Rollout observabilidade: IMPETUS_POLICY_CONTRACT_ENABLED=true
 */

const { randomUUID } = require('crypto');

const POLICY_DECISION_SCHEMA_VERSION = '2026-05-v1';

const POLICY_RISK_LEVELS = Object.freeze({
  SAFE: 'safe',
  WARNING: 'warning',
  HIGH: 'high',
  CRITICAL: 'critical'
});

const POLICY_OBLIGATIONS = Object.freeze({
  HITL_REQUIRED: 'HITL_REQUIRED',
  AUDIT_REQUIRED: 'AUDIT_REQUIRED',
  TRACE_REQUIRED: 'TRACE_REQUIRED',
  SOFTEN_REQUIRED: 'SOFTEN_REQUIRED',
  LIMIT_AUTONOMY: 'LIMIT_AUTONOMY',
  REDACT_OUTPUT: 'REDACT_OUTPUT',
  ESCALATE_RUNTIME: 'ESCALATE_RUNTIME'
});

const POLICY_TRACE_TYPES = Object.freeze({
  SIGNAL: 'SIGNAL',
  EFFECT: 'EFFECT',
  OVERRIDE: 'OVERRIDE',
  ESCALATION: 'ESCALATION',
  DECISION: 'DECISION'
});

/** Efeitos reconhecidos no contrato (subset alinhado à Fase 1; sem execução). */
const POLICY_CONTRACT_EFFECTS = Object.freeze({
  BLOCK: 'BLOCK',
  SOFTEN: 'SOFTEN',
  ESCALATE: 'ESCALATE',
  ROUTE: 'ROUTE',
  LIMIT: 'LIMIT',
  REDACT: 'REDACT'
});

const _ALLOWED_RISK = new Set(Object.values(POLICY_RISK_LEVELS));
const _ALLOWED_OBLIGATIONS = new Set(Object.values(POLICY_OBLIGATIONS));
const _ALLOWED_TRACE_TYPES = new Set(Object.values(POLICY_TRACE_TYPES));
const _ALLOWED_EFFECTS = new Set(Object.values(POLICY_CONTRACT_EFFECTS));
const _ALLOWED_SIGNAL_NAMES = new Set([
  'CSI',
  'DRIFT',
  'CALIBRATION',
  'SAFETY',
  'INTEGRITY',
  'CONSENSUS',
  'RUNTIME',
  'TENANT',
  'RISK',
  'CHANNEL',
  'CONFIDENCE',
  'ROLE',
  'CAPABILITY',
  'TRACE'
]);

const _SIGNAL_SEVERITIES = new Set(['info', 'low', 'warning', 'high', 'critical']);

const _SOURCE_ALIASES = Object.freeze({
  gateway: 'gateway',
  aigateway: 'gateway',
  'ai-security-gateway': 'gateway',
  integrity: 'integrity',
  'context-integrity': 'integrity',
  safety: 'safety',
  governance: 'governance',
  learning: 'learning',
  orchestrator: 'orchestrator',
  policyengine: 'policyEngineService',
  policyengineservice: 'policyEngineService',
  'policy-engine': 'policyEngineService',
  declarative: 'policyEngineService',
  runtime: 'runtime',
  tenant: 'tenant_governance'
});

function isPolicyContractEnabled() {
  return String(process.env.IMPETUS_POLICY_CONTRACT_ENABLED || '')
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

function _defaults() {
  return {
    decision_id: randomUUID(),
    schema_version: POLICY_DECISION_SCHEMA_VERSION,
    allow: true,
    risk_level: POLICY_RISK_LEVELS.SAFE,
    effects: [],
    obligations: [],
    signals: [],
    policy_sources: [],
    executors: [],
    overrides: [],
    trace: [],
    metadata: {},
    generated_at: _nowIso()
  };
}

/**
 * Padroniza sinais (CSI, drift, calibration, safety, integrity, consensus, runtime, tenant governance).
 * @param {unknown} raw
 * @returns {{ signal: string, severity: string, value: number|null }[]}
 */
function normalizePolicySignals(raw) {
  let list = [];
  try {
    if (Array.isArray(raw)) list = raw;
    else if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
      list = Object.entries(raw).map(([k, v]) => {
        if (v != null && typeof v === 'object') return { ...v, signal: v.signal || k };
        return { signal: k, value: v };
      });
    }
  } catch (_e) {
    list = [];
  }

  const out = [];
  for (const item of list) {
    if (item == null) continue;
    const sigRaw = item.signal != null ? item.signal : item.type != null ? item.type : item.name;
    const sigKey = _safeStr(sigRaw, 64).trim();
    const upper = sigKey.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    const signal = _ALLOWED_SIGNAL_NAMES.has(upper) ? upper : 'RUNTIME';
    let severity = _safeStr(item.severity, 32).trim().toLowerCase();
    if (!_SIGNAL_SEVERITIES.has(severity)) severity = 'info';
    let value = null;
    if (item.value != null && typeof item.value === 'number' && Number.isFinite(item.value)) value = item.value;
    else if (item.value != null && typeof item.value === 'string' && item.value.trim() !== '') {
      const n = Number(item.value);
      if (Number.isFinite(n)) value = n;
    }
    out.push({ signal, severity, value });
  }
  try {
    console.info('[POLICY_NORMALIZATION]', JSON.stringify({ step: 'signals', count: out.length }));
  } catch (_e2) {}
  return out;
}

/**
 * Padroniza efeitos declarativos (sem execução).
 * @param {unknown} raw
 * @returns {string[]}
 */
function normalizePolicyEffects(raw) {
  let list = [];
  try {
    if (Array.isArray(raw)) list = raw;
    else if (raw != null && typeof raw === 'string') list = [raw];
  } catch (_e) {
    list = [];
  }
  const out = [];
  for (const item of list) {
    let code = null;
    if (typeof item === 'string') code = item.trim().toUpperCase();
    else if (item != null && typeof item === 'object' && item.effect != null) code = String(item.effect).trim().toUpperCase();
    if (code && _ALLOWED_EFFECTS.has(code)) out.push(code);
  }
  try {
    console.info('[POLICY_NORMALIZATION]', JSON.stringify({ step: 'effects', count: out.length }));
  } catch (_e2) {}
  return [...new Set(out)];
}

/**
 * Padroniza origens normativas (gateway, integrity, safety, …).
 * @param {unknown} raw
 * @returns {{ id: string, label: string }[]}
 */
function normalizePolicySources(raw) {
  let list = [];
  try {
    if (Array.isArray(raw)) list = raw;
    else if (raw != null && typeof raw === 'string') list = [raw];
  } catch (_e) {
    list = [];
  }
  const labels = {
    gateway: 'AI Security Gateway',
    integrity: 'Context Integrity',
    safety: 'Cognitive Safety',
    governance: 'Adaptive Governance',
    learning: 'Learning / supervision',
    orchestrator: 'Unified Orchestrator',
    policyEngineService: 'Policy Engine (declarative)',
    runtime: 'Runtime flags',
    tenant_governance: 'Tenant governance'
  };
  const out = [];
  for (const item of list) {
    let key = '';
    if (typeof item === 'string') key = item.trim().toLowerCase().replace(/\s+/g, '-');
    else if (item != null && typeof item === 'object' && item.id != null) key = String(item.id).trim().toLowerCase();
    const id = _SOURCE_ALIASES[key] || (key && /^[a-z0-9_]+$/.test(key) ? key : 'runtime');
    const label = labels[id] || id;
    out.push({ id, label: _safeStr(label, 128) });
  }
  const seen = new Set();
  const dedup = out.filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
  try {
    console.info('[POLICY_NORMALIZATION]', JSON.stringify({ step: 'sources', count: dedup.length }));
  } catch (_e2) {}
  return dedup;
}

function _normalizeStringArray(raw, normalizer) {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => (normalizer ? normalizer(x) : _safeStr(x, 256))).filter(Boolean);
}

function _normalizeTraceEntries(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const entry of raw) {
    if (entry == null || typeof entry !== 'object') continue;
    let type = String(entry.type || '').toUpperCase();
    if (!_ALLOWED_TRACE_TYPES.has(type)) type = POLICY_TRACE_TYPES.DECISION;
    out.push({
      type,
      source: _safeStr(entry.source, 128) || 'unknown',
      message: _safeStr(entry.message, 2000),
      timestamp: entry.timestamp && String(entry.timestamp).trim() ? String(entry.timestamp) : _nowIso()
    });
  }
  return out;
}

/**
 * Garante arrays, enums e trace consistentes — sem throw.
 * @param {Record<string, unknown>} input
 * @returns {Record<string, unknown>}
 */
function normalizePolicyDecision(input) {
  let base;
  try {
    base = typeof input === 'object' && input != null ? { ...input } : {};
  } catch (_e) {
    base = {};
  }

  const d = { ..._defaults(), ...base };
  d.decision_id = _safeStr(d.decision_id, 64) || randomUUID();
  d.schema_version = _safeStr(d.schema_version, 32) || POLICY_DECISION_SCHEMA_VERSION;
  d.allow = d.allow === false ? false : true;

  let rl = typeof d.risk_level === 'string' ? d.risk_level.trim().toLowerCase() : '';
  if (!_ALLOWED_RISK.has(rl)) rl = POLICY_RISK_LEVELS.SAFE;
  d.risk_level = rl;

  d.effects = normalizePolicyEffects(d.effects);
  d.signals = normalizePolicySignals(d.signals);
  d.policy_sources = normalizePolicySources(d.policy_sources);

  d.executors = _normalizeStringArray(d.executors, (x) => _safeStr(x, 128));
  d.overrides = Array.isArray(d.overrides) ? d.overrides.filter((x) => x != null && typeof x === 'object') : [];

  const obRaw = Array.isArray(d.obligations) ? d.obligations : [];
  d.obligations = [];
  for (const o of obRaw) {
    const code = typeof o === 'string' ? o.trim().toUpperCase() : '';
    if (code && _ALLOWED_OBLIGATIONS.has(code)) d.obligations.push(code);
  }
  d.obligations = [...new Set(d.obligations)];

  d.trace = _normalizeTraceEntries(d.trace);

  if (d.metadata != null && typeof d.metadata === 'object' && !Array.isArray(d.metadata)) {
    d.metadata = { ...d.metadata };
  } else {
    d.metadata = {};
  }

  if (!d.generated_at || typeof d.generated_at !== 'string') d.generated_at = _nowIso();

  try {
    console.info('[POLICY_NORMALIZATION]', JSON.stringify({ step: 'decision', id: d.decision_id }));
  } catch (_e2) {}
  return d;
}

/**
 * Builder oficial — defaults seguros + UUID.
 * @param {Record<string, unknown>} [partial]
 */
function createPolicyDecision(partial) {
  const p = partial && typeof partial === 'object' ? partial : {};
  const merged = { ...p };
  if (merged.decision_id == null) merged.decision_id = randomUUID();
  if (merged.generated_at == null) merged.generated_at = _nowIso();
  const normalized = normalizePolicyDecision(merged);
  try {
    console.info(
      '[POLICY_DECISION]',
      JSON.stringify({
        action: 'create',
        decision_id: normalized.decision_id,
        allow: normalized.allow,
        risk_level: normalized.risk_level
      })
    );
  } catch (_e) {}
  return normalized;
}

/**
 * Anexa entrada de trace (imutável sobre cópia da decisão).
 * @param {Record<string, unknown>} decision
 * @param {Record<string, unknown>} entry
 */
function appendPolicyTrace(decision, entry) {
  const base =
    decision && typeof decision === 'object'
      ? normalizePolicyDecision(decision)
      : createPolicyDecision({});
  let type = POLICY_TRACE_TYPES.DECISION;
  try {
    const t = entry && entry.type != null ? String(entry.type).toUpperCase() : '';
    if (t && _ALLOWED_TRACE_TYPES.has(t)) type = t;
  } catch (_e) {}
  const traceEntry = {
    type,
    source: entry && entry.source != null ? _safeStr(entry.source, 128) : 'unknown',
    message: entry && entry.message != null ? _safeStr(entry.message, 2000) : '',
    timestamp: entry && entry.timestamp ? String(entry.timestamp) : _nowIso()
  };
  try {
    console.info('[POLICY_TRACE]', JSON.stringify({ append: true, type: traceEntry.type, source: traceEntry.source }));
  } catch (_e2) {}
  return normalizePolicyDecision({
    ...base,
    trace: [...(base.trace || []), traceEntry]
  });
}

/**
 * @returns {{ valid: boolean, errors: { path: string, message: string }[] }}
 */
function validatePolicyDecision(decision) {
  const errors = [];
  try {
    if (!decision || typeof decision !== 'object') {
      errors.push({ path: '', message: 'decision_missing' });
      try {
        console.info('[POLICY_VALIDATION]', JSON.stringify({ valid: false, errors: errors.length }));
      } catch (_e) {}
      return { valid: false, errors };
    }
    if (decision.schema_version !== POLICY_DECISION_SCHEMA_VERSION) {
      errors.push({ path: 'schema_version', message: 'schema_mismatch_or_unknown' });
    }
    if (!_ALLOWED_RISK.has(decision.risk_level)) {
      errors.push({ path: 'risk_level', message: 'invalid_risk_level' });
    }
    if (typeof decision.allow !== 'boolean') {
      errors.push({ path: 'allow', message: 'allow_not_boolean' });
    }
    if (!Array.isArray(decision.effects)) errors.push({ path: 'effects', message: 'effects_not_array' });
    else {
      for (const e of decision.effects) {
        if (!_ALLOWED_EFFECTS.has(e)) errors.push({ path: 'effects', message: `unknown_effect:${e}` });
      }
    }
    if (!Array.isArray(decision.obligations)) errors.push({ path: 'obligations', message: 'obligations_not_array' });
    else {
      for (const o of decision.obligations) {
        if (!_ALLOWED_OBLIGATIONS.has(o)) errors.push({ path: 'obligations', message: `unknown_obligation:${o}` });
      }
    }
    if (!Array.isArray(decision.signals)) errors.push({ path: 'signals', message: 'signals_not_array' });
    if (!Array.isArray(decision.trace)) errors.push({ path: 'trace', message: 'trace_not_array' });
    else {
      for (let i = 0; i < decision.trace.length; i++) {
        const t = decision.trace[i];
        if (!t || typeof t !== 'object') errors.push({ path: `trace[${i}]`, message: 'invalid_trace_entry' });
        else if (!_ALLOWED_TRACE_TYPES.has(t.type)) errors.push({ path: `trace[${i}].type`, message: 'invalid_trace_type' });
      }
    }
    if (!Array.isArray(decision.policy_sources)) {
      errors.push({ path: 'policy_sources', message: 'policy_sources_not_array' });
    }
  } catch (e) {
    errors.push({ path: '', message: _safeStr(e && e.message, 200) || 'validation_exception' });
  }
  const valid = errors.length === 0;
  try {
    console.info('[POLICY_VALIDATION]', JSON.stringify({ valid, error_count: errors.length }));
  } catch (_e2) {}
  return { valid, errors };
}

/**
 * Catálogo do contrato (taxonomia oficial exposta — só leitura).
 */
function generateDecisionContractSnapshot() {
  return {
    schema_version: POLICY_DECISION_SCHEMA_VERSION,
    generated_at: _nowIso(),
    risk_levels: [...Object.values(POLICY_RISK_LEVELS)],
    effects: [...Object.values(POLICY_CONTRACT_EFFECTS)],
    obligations: [...Object.values(POLICY_OBLIGATIONS)],
    trace_types: [...Object.values(POLICY_TRACE_TYPES)]
  };
}

/** Resumo para GET /dashboard (não gera decisão completa por defeito). */
function getPolicyContractDashboardSummary() {
  if (!isPolicyContractEnabled()) {
    return {
      enabled: false,
      code: 'POLICY_CONTRACT_DISABLED',
      message: 'Defina IMPETUS_POLICY_CONTRACT_ENABLED=true para o contrato normativo (PDC).'
    };
  }
  const snap = generateDecisionContractSnapshot();
  const sample = normalizePolicyDecision({
    risk_level: POLICY_RISK_LEVELS.WARNING,
    signals: [{ signal: 'CSI', severity: 'warning', value: 62 }],
    effects: ['SOFTEN'],
    obligations: [POLICY_OBLIGATIONS.TRACE_REQUIRED],
    policy_sources: ['gateway', 'governance']
  });
  const validation = validatePolicyDecision(sample);
  let contract_status = 'invalid';
  if (validation.valid) contract_status = 'valid';
  else if (validation.errors.some((e) => e.path === 'schema_version')) contract_status = 'schema_drift';
  return {
    enabled: true,
    schema_version: snap.schema_version,
    risk_levels: snap.risk_levels,
    obligation_catalog_count: snap.obligations.length,
    trace_type_count: snap.trace_types.length,
    effect_catalog_count: snap.effects.length,
    contract_status,
    sample_decision_id: sample.decision_id,
    sample_validation_ok: validation.valid
  };
}

module.exports = {
  POLICY_DECISION_SCHEMA_VERSION,
  POLICY_RISK_LEVELS,
  POLICY_OBLIGATIONS,
  POLICY_TRACE_TYPES,
  POLICY_CONTRACT_EFFECTS,
  isPolicyContractEnabled,
  createPolicyDecision,
  normalizePolicyDecision,
  appendPolicyTrace,
  normalizePolicySignals,
  normalizePolicyEffects,
  normalizePolicySources,
  validatePolicyDecision,
  generateDecisionContractSnapshot,
  getPolicyContractDashboardSummary
};
