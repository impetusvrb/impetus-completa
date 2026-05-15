'use strict';

/**
 * IMPETUS — Cognitive Policy Engine · Fase 4 (Policy Facade — read-only)
 * Agregação normativa observável: veredito passivo sem enforcement nem execução de efeitos.
 * Rollout: IMPETUS_POLICY_FACADE_ENABLED=true
 */

const cognitivePolicyDecisionService = require('./cognitivePolicyDecisionService');
const cognitivePolicySignalService = require('./cognitivePolicySignalService');

const { POLICY_RISK_LEVELS, POLICY_OBLIGATIONS, POLICY_TRACE_TYPES, createPolicyDecision, validatePolicyDecision } =
  cognitivePolicyDecisionService;

const { aggregatePolicySignals, POLICY_SIGNAL_SEVERITY } = cognitivePolicySignalService;

function isPolicyFacadeEnabled() {
  return String(process.env.IMPETUS_POLICY_FACADE_ENABLED || '')
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

/** Normaliza entradas heterogéneas para objetos PolicySignal (PSA). */
function _coercePolicySignals(rawList) {
  if (!Array.isArray(rawList)) return [];
  const out = [];
  for (const item of rawList) {
    if (item == null) continue;
    if (typeof item === 'object' && item.signal_id != null && item.signal_type != null) {
      out.push(item);
      continue;
    }
    try {
      out.push(cognitivePolicySignalService.createPolicySignal(item));
    } catch (_e) {
      /* skip */
    }
  }
  return out;
}

/**
 * Regras mínimas observacionais: ≥1 critical → critical; ≥2 high → high; ≥3 warning → warning; senão safe.
 * @param {{ critical?: number, high?: number, warning?: number, low?: number, info?: number }} counts
 */
function composePolicyRiskLevel(counts) {
  const c = counts || {};
  const critical = Number(c.critical) || 0;
  const high = Number(c.high) || 0;
  const warning = Number(c.warning) || 0;
  let level = POLICY_RISK_LEVELS.SAFE;
  if (critical >= 1) level = POLICY_RISK_LEVELS.CRITICAL;
  else if (high >= 2) level = POLICY_RISK_LEVELS.HIGH;
  else if (warning >= 3) level = POLICY_RISK_LEVELS.WARNING;
  try {
    console.info('[POLICY_RISK_COMPOSITION]', JSON.stringify({ critical, high, warning, level }));
  } catch (_e) {}
  return level;
}

/**
 * Efeitos sugeridos apenas (subset PDC); não executados.
 * @param {unknown[]} policySignals
 * @param {{ correlations?: unknown[] }} [_ctx]
 */
function composePolicyEffects(policySignals, _ctx) {
  const signals = Array.isArray(policySignals) ? policySignals : [];
  const suggested = [];
  const hasType = (t) => signals.some((s) => s && String(s.signal_type).toUpperCase() === t);
  const sev = (t) => {
    const x = signals.find((s) => s && String(s.signal_type).toUpperCase() === t);
    return x ? String(x.severity || '').toLowerCase() : '';
  };

  if (hasType('INTEGRITY') && sev('INTEGRITY') === POLICY_SIGNAL_SEVERITY.CRITICAL) {
    suggested.push('BLOCK');
  }
  const safetySev = sev('SAFETY');
  if (hasType('SAFETY') && (safetySev === POLICY_SIGNAL_SEVERITY.HIGH || safetySev === POLICY_SIGNAL_SEVERITY.CRITICAL)) {
    suggested.push('SOFTEN');
  }
  const csiSev = sev('CSI');
  const driftSev = sev('DRIFT');
  const csiLow = csiSev === POLICY_SIGNAL_SEVERITY.INFO || csiSev === POLICY_SIGNAL_SEVERITY.LOW || csiSev === '';
  const driftHigh = driftSev === POLICY_SIGNAL_SEVERITY.HIGH || driftSev === POLICY_SIGNAL_SEVERITY.CRITICAL;
  if (hasType('CSI') && hasType('DRIFT') && csiLow && driftHigh) {
    suggested.push('LIMIT');
  }

  const uniq = [...new Set(suggested)];
  try {
    console.info('[POLICY_EFFECT_COMPOSITION]', JSON.stringify({ count: uniq.length, effects: uniq }));
  } catch (_e2) {}
  return uniq;
}

/**
 * Obrigações sugeridas (PDC); sem enforcement.
 */
function composePolicyObligations(policySignals, correlations) {
  const signals = Array.isArray(policySignals) ? policySignals : [];
  const corr = Array.isArray(correlations) ? correlations : [];
  const out = [];
  const hasType = (t) => signals.some((s) => s && String(s.signal_type).toUpperCase() === t);
  const sevAtLeast = (t, min) => {
    const x = signals.find((s) => s && String(s.signal_type).toUpperCase() === t);
    if (!x) return false;
    const order = { info: 0, low: 1, warning: 2, high: 3, critical: 4 };
    return (order[String(x.severity || '').toLowerCase()] ?? 0) >= (order[min] ?? 0);
  };

  if (hasType('SAFETY') && sevAtLeast('SAFETY', 'critical')) {
    out.push(POLICY_OBLIGATIONS.HITL_REQUIRED);
  }
  if (sevAtLeast('DRIFT', 'warning') && sevAtLeast('CONSENSUS', 'warning')) {
    out.push(POLICY_OBLIGATIONS.AUDIT_REQUIRED);
  }
  if (hasType('INTEGRITY') && (sevAtLeast('INTEGRITY', 'warning') || sevAtLeast('INTEGRITY', 'high'))) {
    out.push(POLICY_OBLIGATIONS.TRACE_REQUIRED);
  }
  for (const c of corr) {
    if (c && c.type === 'integrity_tenant' && String(c.severity || '').toLowerCase() === 'high') {
      out.push(POLICY_OBLIGATIONS.AUDIT_REQUIRED);
    }
  }
  const uniq = [...new Set(out)];
  try {
    console.info('[POLICY_OBLIGATION_COMPOSITION]', JSON.stringify({ count: uniq.length }));
  } catch (_e) {}
  return uniq;
}

/**
 * Correlações heurísticas entre sinais (sem arbitration).
 */
function detectPolicyCorrelations(policySignals, context, tenant) {
  const signals = Array.isArray(policySignals) ? policySignals : [];
  const ctx = context && typeof context === 'object' ? context : {};
  const correlations = [];

  const pick = (t) => signals.find((s) => s && String(s.signal_type).toUpperCase() === t);
  const sevNum = (s) => {
    if (!s) return 0;
    const o = { info: 0, low: 1, warning: 2, high: 3, critical: 4 };
    return o[String(s.severity || '').toLowerCase()] ?? 0;
  };

  const drift = pick('DRIFT');
  const cal = pick('CALIBRATION');
  if (drift && cal && sevNum(drift) >= 2 && sevNum(cal) >= 2) {
    correlations.push({ type: 'drift_calibration_anomaly', severity: 'high' });
  }

  const cons = pick('CONSENSUS');
  const safety = pick('SAFETY');
  if (cons && safety && sevNum(cons) >= 2 && sevNum(safety) >= 1) {
    correlations.push({ type: 'consensus_safety', severity: 'medium' });
  }

  const integ = pick('INTEGRITY');
  const tenantAnomaly = !!(tenant && tenant.anomaly) || !!ctx.tenant_anomaly;
  if (integ && tenantAnomaly && sevNum(integ) >= 1) {
    correlations.push({ type: 'integrity_tenant', severity: 'high' });
  }

  const csi = pick('CSI');
  const autonomyDegraded = !!ctx.autonomy_degraded;
  if (csi && autonomyDegraded && sevNum(csi) >= 2) {
    correlations.push({ type: 'csi_autonomy_degradation', severity: 'high' });
  }

  if (correlations.some((c) => c.type === 'drift_calibration_anomaly' || c.type === 'csi_autonomy_degradation')) {
    correlations.push({ type: 'stability_risk', severity: 'high' });
  }

  try {
    console.info('[POLICY_CORRELATION]', JSON.stringify({ count: correlations.length }));
  } catch (_e) {}
  return { correlations };
}

function buildPolicyFacadeSummary(policySignals, riskLevel, effectsSuggested, obligationsSuggested, correlations) {
  const { summary: agg } = aggregatePolicySignals(policySignals);
  const critical_signals = Number(agg.critical) || 0;
  const total =
    (Number(agg.info) || 0) +
    (Number(agg.low) || 0) +
    (Number(agg.warning) || 0) +
    (Number(agg.high) || 0) +
    critical_signals;
  return {
    signals_total: total,
    critical_signals,
    effects_suggested: Array.isArray(effectsSuggested) ? effectsSuggested.length : 0,
    obligations_suggested: Array.isArray(obligationsSuggested) ? obligationsSuggested.length : 0,
    risk_level: riskLevel,
    warnings_count: Number(agg.warning) || 0,
    high_count: Number(agg.high) || 0,
    correlations_detected: Array.isArray(correlations) ? correlations.length : 0
  };
}

/**
 * Trace ao nível da facade (lista paralela ao PDC decision.trace).
 */
function appendPolicyFacadeTrace(traceList, entry) {
  const list = Array.isArray(traceList) ? [...traceList] : [];
  const type = _safeStr(entry && entry.type, 32).toUpperCase() || 'DECISION';
  list.push({
    type,
    message: _safeStr(entry && entry.message, 2000),
    timestamp: entry && entry.timestamp ? String(entry.timestamp) : _nowIso(),
    detail: entry && entry.detail && typeof entry.detail === 'object' ? entry.detail : undefined
  });
  try {
    console.info('[POLICY_FACADE]', JSON.stringify({ trace: type, message: list[list.length - 1].message?.slice(0, 120) }));
  } catch (_e) {}
  return list;
}

function _signalsToPdcSignals(policySignals) {
  return (Array.isArray(policySignals) ? policySignals : []).map((s) => ({
    signal: String(s.signal_type || 'RUNTIME').toUpperCase(),
    severity: String(s.severity || 'info').toLowerCase(),
    value: typeof s.value === 'number' && Number.isFinite(s.value) ? s.value : s.normalized_value != null ? s.normalized_value * 100 : 0
  }));
}

/**
 * Avaliação passiva da facade (sem side effects nos engines).
 * @param {{ signals?: unknown[], context?: Record<string, unknown>, channel?: string, tenant?: Record<string, unknown> }} input
 */
function evaluatePolicyFacade(input) {
  const trace = [];
  let t = appendPolicyFacadeTrace(trace, {
    type: POLICY_TRACE_TYPES.DECISION,
    message: 'Policy facade evaluation started (read-only)'
  });

  const raw = input && typeof input === 'object' ? input : {};
  const channel = _safeStr(raw.channel, 64) || 'dashboard_chat';
  const context = raw.context && typeof raw.context === 'object' ? raw.context : {};
  const tenant = raw.tenant && typeof raw.tenant === 'object' ? raw.tenant : {};

  const policySignals = _coercePolicySignals(raw.signals);
  const { summary: severityCounts } = aggregatePolicySignals(policySignals);

  const riskLevel = composePolicyRiskLevel(severityCounts);
  const { correlations: correlationList } = detectPolicyCorrelations(policySignals, context, tenant);
  const effectsSuggested = composePolicyEffects(policySignals, { correlations: correlationList });
  const obligationsSuggested = composePolicyObligations(policySignals, correlationList);

  t = appendPolicyFacadeTrace(t, {
    type: POLICY_TRACE_TYPES.DECISION,
    message: `Facade composed ${String(riskLevel).toUpperCase()} risk level`,
    detail: { severity_counts: severityCounts }
  });

  if (correlationList.length) {
    t = appendPolicyFacadeTrace(t, {
      type: POLICY_TRACE_TYPES.SIGNAL,
      message: `Correlations: ${correlationList.map((c) => c.type).join(', ')}`
    });
  }

  const summary = buildPolicyFacadeSummary(
    policySignals,
    riskLevel,
    effectsSuggested,
    obligationsSuggested,
    correlationList
  );

  const allow = riskLevel !== POLICY_RISK_LEVELS.CRITICAL;

  const decision = createPolicyDecision({
    allow,
    risk_level: riskLevel,
    effects: effectsSuggested,
    obligations: obligationsSuggested,
    signals: _signalsToPdcSignals(policySignals),
    metadata: {
      policy_facade: true,
      channel,
      passive_only: true,
      correlations: correlationList
    },
    trace: [
      {
        type: POLICY_TRACE_TYPES.DECISION,
        source: 'cognitivePolicyFacadeService',
        message: 'Facade composed policy decision (observational)',
        timestamp: _nowIso()
      }
    ]
  });

  try {
    console.info(
      '[POLICY_FACADE]',
      JSON.stringify({
        action: 'evaluate',
        risk_level: riskLevel,
        signals: summary.signals_total,
        correlations: summary.correlations_detected
      })
    );
  } catch (_e2) {}

  return { decision, summary, trace: t };
}

/**
 * @param {{ decision?: unknown, summary?: unknown, trace?: unknown }} result
 */
function validatePolicyFacadeResult(result) {
  const errors = [];
  try {
    if (!result || typeof result !== 'object') {
      errors.push({ path: '', message: 'result_missing' });
      return { valid: false, errors };
    }
    const dv = validatePolicyDecision(result.decision);
    if (!dv.valid) {
      for (const e of dv.errors) errors.push({ path: `decision.${e.path}`, message: e.message });
    }
    const s = result.summary;
    if (!s || typeof s !== 'object') errors.push({ path: 'summary', message: 'missing' });
    else {
      if (typeof s.risk_level !== 'string') errors.push({ path: 'summary.risk_level', message: 'invalid' });
      if (s.risk_level && result.decision && result.decision.risk_level !== s.risk_level) {
        errors.push({ path: 'summary.risk_consistency', message: 'risk_mismatch_decision' });
      }
      if (typeof s.signals_total !== 'number') errors.push({ path: 'summary.signals_total', message: 'invalid' });
      if (typeof s.effects_suggested !== 'number') errors.push({ path: 'summary.effects_suggested', message: 'invalid' });
      if (s.effects_suggested !== (result.decision?.effects || []).length) {
        errors.push({ path: 'summary.effect_consistency', message: 'effects_count_mismatch' });
      }
    }
    if (!Array.isArray(result.trace)) errors.push({ path: 'trace', message: 'not_array' });
    else {
      for (let i = 0; i < result.trace.length; i++) {
        const tr = result.trace[i];
        if (!tr || typeof tr !== 'object' || !_safeStr(tr.message, 1)) {
          errors.push({ path: `trace[${i}]`, message: 'invalid_entry' });
        }
      }
    }
  } catch (e) {
    errors.push({ path: '', message: _safeStr(e && e.message, 200) || 'validation_exception' });
  }
  return { valid: errors.length === 0, errors };
}

function generatePolicyFacadeSnapshot() {
  return {
    facade_enabled: isPolicyFacadeEnabled(),
    generated_at: _nowIso(),
    risk_composition_rules: [
      'critical_count >= 1 => risk critical',
      'high_count >= 2 => risk high',
      'warning_count >= 3 => risk warning',
      'else => safe'
    ],
    supported_effects: ['BLOCK', 'SOFTEN', 'LIMIT'],
    supported_obligations: [
      POLICY_OBLIGATIONS.HITL_REQUIRED,
      POLICY_OBLIGATIONS.AUDIT_REQUIRED,
      POLICY_OBLIGATIONS.TRACE_REQUIRED
    ],
    correlation_types: [
      'drift_calibration_anomaly',
      'consensus_safety',
      'integrity_tenant',
      'csi_autonomy_degradation',
      'stability_risk'
    ]
  };
}

function _demoFacadeInput() {
  const ctx = { tenant_scope: 'company_id', runtime_scope: 'dashboard_chat' };
  const signals = [
    cognitivePolicySignalService.adaptCsiSignal({ csi: 55, status: 'warning', unavailable: false }, ctx),
    cognitivePolicySignalService.adaptDriftSignal({ recent_drift_events: 6, high_severity: 0 }, ctx),
    cognitivePolicySignalService.adaptConsensusSignal({ consensus_score: 0.7, divergence_events: 4 }, ctx),
    cognitivePolicySignalService.adaptCalibrationSignal({ overconfidence_events: 6, underconfidence_events: 0 }, ctx),
    cognitivePolicySignalService.adaptIntegritySignal({ integrity_failures: 1, status: 'warning', block_mode: false }, ctx),
    cognitivePolicySignalService.adaptSafetySignal({ risk_score: 0.8, risk_level: 'critical', engine_enabled: true }, ctx)
  ];
  return {
    signals,
    context: { autonomy_degraded: true, tenant_anomaly: false },
    channel: 'dashboard_chat',
    tenant: { id: 'demo' }
  };
}

function getPolicyFacadeDashboardSummary() {
  if (!isPolicyFacadeEnabled()) {
    return {
      enabled: false,
      code: 'POLICY_FACADE_DISABLED',
      message: 'Defina IMPETUS_POLICY_FACADE_ENABLED=true para a fachada normativa (read-only).'
    };
  }
  const demoInput = _demoFacadeInput();
  const { decision, summary, trace } = evaluatePolicyFacade(demoInput);
  const validation = validatePolicyFacadeResult({ decision, summary, trace });
  return {
    enabled: true,
    generated_at: _nowIso(),
    demo_signals_aggregated: summary.signals_total,
    risk_level: summary.risk_level,
    suggested_effects: decision.effects || [],
    suggested_obligations: decision.obligations || [],
    correlations_detected: summary.correlations_detected,
    facade_trace_steps: trace.length,
    validation_ok: validation.valid,
    passive_allow: decision.allow
  };
}

function generatePolicyFacadeAdminPayload() {
  const snapshot = generatePolicyFacadeSnapshot();
  const demo_evaluation = evaluatePolicyFacade(_demoFacadeInput());
  return { snapshot, demo_evaluation };
}

module.exports = {
  isPolicyFacadeEnabled,
  composePolicyRiskLevel,
  composePolicyEffects,
  composePolicyObligations,
  detectPolicyCorrelations,
  buildPolicyFacadeSummary,
  appendPolicyFacadeTrace,
  evaluatePolicyFacade,
  validatePolicyFacadeResult,
  generatePolicyFacadeSnapshot,
  getPolicyFacadeDashboardSummary,
  generatePolicyFacadeAdminPayload
};
