'use strict';

/**
 * IMPETUS — Cognitive Policy Engine · Fase 6 (Policy Obligation Layer — read-only)
 * Obrigações normativas declarativas: composição, correlação, prioridade e trace sem execução.
 * Rollout: IMPETUS_POLICY_OBLIGATIONS_ENABLED=true
 */

const { randomUUID } = require('crypto');

const POLICY_OBLIGATION_STATUS = Object.freeze({
  DECLARED: 'declared',
  OBSERVED: 'observed',
  SIMULATED: 'simulated',
  ESCALATED: 'escalated'
});

const POLICY_OBLIGATION_SEVERITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
});

const POLICY_OBLIGATION_TYPES = Object.freeze({
  HITL_REQUIRED: 'HITL_REQUIRED',
  AUDIT_REQUIRED: 'AUDIT_REQUIRED',
  TRACE_REQUIRED: 'TRACE_REQUIRED',
  SOFTEN_REQUIRED: 'SOFTEN_REQUIRED',
  LIMIT_AUTONOMY: 'LIMIT_AUTONOMY',
  ESCALATE_RUNTIME: 'ESCALATE_RUNTIME',
  REDACT_OUTPUT: 'REDACT_OUTPUT',
  TENANT_REVIEW: 'TENANT_REVIEW',
  SECURITY_REVIEW: 'SECURITY_REVIEW'
});

const TYPE_RANK = Object.freeze({
  HITL_REQUIRED: 100,
  AUDIT_REQUIRED: 85,
  ESCALATE_RUNTIME: 80,
  SECURITY_REVIEW: 78,
  TENANT_REVIEW: 75,
  TRACE_REQUIRED: 70,
  REDACT_OUTPUT: 65,
  LIMIT_AUTONOMY: 60,
  SOFTEN_REQUIRED: 55
});

const SEVERITY_RANK = Object.freeze({
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
});

const COMPOSITION_RULES = Object.freeze([
  { id: 'safety_critical_hitl', condition: 'safety_critical', obligation: 'HITL_REQUIRED' },
  { id: 'integrity_anomaly_trace', condition: 'integrity_anomaly', obligation: 'TRACE_REQUIRED' },
  { id: 'drift_calibration_audit', condition: 'drift_calibration', obligation: 'AUDIT_REQUIRED' },
  { id: 'autonomy_instability_limit', condition: 'autonomy_instability', obligation: 'LIMIT_AUTONOMY' },
  { id: 'security_conflict_review', condition: 'security_conflict', obligation: 'SECURITY_REVIEW' },
  { id: 'tenant_anomaly_review', condition: 'tenant_anomaly', obligation: 'TENANT_REVIEW' }
]);

function isPolicyObligationsEnabled() {
  return String(process.env.IMPETUS_POLICY_OBLIGATIONS_ENABLED || '')
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

function _normSeverity(s) {
  return _safeStr(s, 32).trim().toLowerCase();
}

/** Normaliza sinais PDC ({ signal, severity, value }) ou PSA. */
function _normalizeCompositionSignals(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const signal = _safeStr(item.signal || item.signal_type || item.type, 32).toUpperCase();
    if (!signal) continue;
    out.push({
      signal,
      severity: _normSeverity(item.severity),
      value: typeof item.value === 'number' && Number.isFinite(item.value) ? item.value : null
    });
  }
  return out;
}

function _sevAtLeast(sev, min) {
  const order = { low: 1, medium: 2, high: 3, critical: 4, info: 0, stable: 0, healthy: 0 };
  return (order[sev] ?? 0) >= (order[min] ?? 0);
}

/**
 * @param {Record<string, unknown>} partial
 */
function createPolicyObligation(partial) {
  let p = {};
  try {
    p = partial && typeof partial === 'object' ? { ...partial } : {};
  } catch (_e) {
    p = {};
  }

  const typeKeys = new Set(Object.values(POLICY_OBLIGATION_TYPES));
  let type = _safeStr(p.type, 48).toUpperCase();
  if (!typeKeys.has(type)) type = POLICY_OBLIGATION_TYPES.AUDIT_REQUIRED;

  const sevKeys = new Set(Object.values(POLICY_OBLIGATION_SEVERITY));
  let severity = _normSeverity(p.severity);
  if (!sevKeys.has(severity)) severity = POLICY_OBLIGATION_SEVERITY.MEDIUM;

  const statusKeys = new Set(Object.values(POLICY_OBLIGATION_STATUS));
  let status = _safeStr(p.status, 24).toLowerCase();
  if (!statusKeys.has(status)) status = POLICY_OBLIGATION_STATUS.DECLARED;

  const required_by = Array.isArray(p.required_by) ? p.required_by.map((x) => _safeStr(x, 64).toUpperCase()).filter(Boolean) : [];

  let metadata = {};
  try {
    if (p.metadata != null && typeof p.metadata === 'object' && !Array.isArray(p.metadata)) {
      metadata = { ...p.metadata };
    }
  } catch (_e2) {
    metadata = {};
  }
  if (!Array.isArray(metadata.obligation_trace)) metadata.obligation_trace = [];

  const ob = {
    obligation_id: p.obligation_id != null ? _safeStr(p.obligation_id, 64) : randomUUID(),
    type,
    severity,
    domain: _safeStr(p.domain, 32).toUpperCase() || 'GOVERNANCE',
    source: _safeStr(p.source, 128) || 'cognitivePolicyObligationService',
    reason: _safeStr(p.reason, 2000) || '',
    required_by,
    status,
    trace_id: p.trace_id != null ? _safeStr(p.trace_id, 128) : randomUUID(),
    metadata,
    generated_at: p.generated_at != null ? _safeStr(p.generated_at, 40) : _nowIso()
  };

  try {
    console.info('[POLICY_OBLIGATION]', JSON.stringify({ action: 'create', type: ob.type, severity: ob.severity }));
  } catch (_e3) {}
  return ob;
}

/**
 * @param {{ signals?: unknown[], decision?: Record<string, unknown>, arbitration?: Record<string, unknown>, context?: Record<string, unknown>, tenant?: Record<string, unknown> }} input
 */
function composePolicyObligations(input) {
  const obligations = [];
  try {
    const inObj = input && typeof input === 'object' ? input : {};
    const decision = inObj.decision && typeof inObj.decision === 'object' ? inObj.decision : {};
    const arbitration = inObj.arbitration && typeof inObj.arbitration === 'object' ? inObj.arbitration : {};
    const context = inObj.context && typeof inObj.context === 'object' ? inObj.context : {};
    const tenant = inObj.tenant && typeof inObj.tenant === 'object' ? inObj.tenant : {};

    const signals = _normalizeCompositionSignals(inObj.signals || decision.signals);
    const riskLevel = _normSeverity(decision.risk_level);
    const dominantDomain = arbitration.winner && arbitration.winner.domain ? String(arbitration.winner.domain).toUpperCase() : null;
    const conflicts = Array.isArray(arbitration.conflicts) ? arbitration.conflicts : [];

    const safetyCrit =
      riskLevel === 'critical' ||
      signals.some((s) => s.signal === 'SAFETY' && _sevAtLeast(s.severity, 'high'));
    if (safetyCrit) {
      obligations.push(
        createPolicyObligation({
          type: POLICY_OBLIGATION_TYPES.HITL_REQUIRED,
          severity: POLICY_OBLIGATION_SEVERITY.CRITICAL,
          domain: 'SAFETY',
          source: 'cognitiveSafetyRuntimeService',
          reason: 'Critical safety signal detected or composed risk critical.',
          required_by: ['SAFETY', dominantDomain].filter(Boolean),
          status: POLICY_OBLIGATION_STATUS.DECLARED
        })
      );
    }

    const integrityAnomaly = signals.some((s) => s.signal === 'INTEGRITY' && _sevAtLeast(s.severity, 'warning'));
    if (integrityAnomaly) {
      obligations.push(
        createPolicyObligation({
          type: POLICY_OBLIGATION_TYPES.TRACE_REQUIRED,
          severity: POLICY_OBLIGATION_SEVERITY.HIGH,
          domain: 'INTEGRITY',
          source: 'contextIntegrityService',
          reason: 'Integrity anomaly — trace declarativo recomendado.',
          required_by: ['INTEGRITY'],
          status: POLICY_OBLIGATION_STATUS.DECLARED
        })
      );
    }

    const driftOk = signals.some((s) => s.signal === 'DRIFT' && _sevAtLeast(s.severity, 'warning'));
    const calOk = signals.some((s) => s.signal === 'CALIBRATION' && _sevAtLeast(s.severity, 'warning'));
    if (driftOk && calOk) {
      obligations.push(
        createPolicyObligation({
          type: POLICY_OBLIGATION_TYPES.AUDIT_REQUIRED,
          severity: POLICY_OBLIGATION_SEVERITY.HIGH,
          domain: 'GOVERNANCE',
          source: 'composePolicyObligations',
          reason: 'Drift + calibration signals — auditoria normativa declarada.',
          required_by: ['DRIFT', 'CALIBRATION'],
          status: POLICY_OBLIGATION_STATUS.DECLARED
        })
      );
    }

    const autonomyInstability = !!context.autonomy_degraded || riskLevel === 'high';
    if (autonomyInstability) {
      obligations.push(
        createPolicyObligation({
          type: POLICY_OBLIGATION_TYPES.LIMIT_AUTONOMY,
          severity: POLICY_OBLIGATION_SEVERITY.MEDIUM,
          domain: 'AUTONOMY',
          source: 'composePolicyObligations',
          reason: 'Autonomy instability observada (contexto ou risco alto).',
          required_by: ['AUTONOMY', dominantDomain].filter(Boolean),
          status: POLICY_OBLIGATION_STATUS.DECLARED
        })
      );
    }

    const securityConflict = conflicts.some((c) => {
      const t = String(c && c.type);
      return t === 'BLOCK_VS_ALLOW' || t === 'SAFETY_VS_RUNTIME' || t === 'SOFTEN_VS_FULL_OUTPUT';
    });
    if (securityConflict) {
      obligations.push(
        createPolicyObligation({
          type: POLICY_OBLIGATION_TYPES.SECURITY_REVIEW,
          severity: POLICY_OBLIGATION_SEVERITY.HIGH,
          domain: 'SECURITY',
          source: 'cognitivePolicyArbitrationService',
          reason: 'Conflito normativo compatível com revisão de segurança.',
          required_by: ['SECURITY'],
          status: POLICY_OBLIGATION_STATUS.DECLARED
        })
      );
    }

    const tenantAnomaly = !!tenant.anomaly || !!context.tenant_anomaly;
    if (tenantAnomaly) {
      obligations.push(
        createPolicyObligation({
          type: POLICY_OBLIGATION_TYPES.TENANT_REVIEW,
          severity: POLICY_OBLIGATION_SEVERITY.MEDIUM,
          domain: 'TENANT',
          source: 'tenant_governance',
          reason: 'Anomalia de tenant observada.',
          required_by: ['TENANT'],
          status: POLICY_OBLIGATION_STATUS.DECLARED
        })
      );
    }

    const effects = Array.isArray(decision.effects) ? decision.effects.map((e) => String(e).toUpperCase()) : [];
    if (effects.includes('SOFTEN')) {
      obligations.push(
        createPolicyObligation({
          type: POLICY_OBLIGATION_TYPES.SOFTEN_REQUIRED,
          severity: POLICY_OBLIGATION_SEVERITY.MEDIUM,
          domain: dominantDomain || 'SAFETY',
          source: 'cognitivePolicyFacadeService',
          reason: 'Effect SOFTEN sugerido na decisão composta.',
          required_by: [dominantDomain || 'SAFETY'],
          status: POLICY_OBLIGATION_STATUS.SIMULATED
        })
      );
    }
    if (effects.includes('ESCALATE')) {
      obligations.push(
        createPolicyObligation({
          type: POLICY_OBLIGATION_TYPES.ESCALATE_RUNTIME,
          severity: POLICY_OBLIGATION_SEVERITY.HIGH,
          domain: 'RUNTIME',
          source: 'cognitivePolicyFacadeService',
          reason: 'Effect ESCALATE sugerido (declarativo).',
          required_by: ['RUNTIME'],
          status: POLICY_OBLIGATION_STATUS.SIMULATED
        })
      );
    }
    if (effects.includes('REDACT')) {
      obligations.push(
        createPolicyObligation({
          type: POLICY_OBLIGATION_TYPES.REDACT_OUTPUT,
          severity: POLICY_OBLIGATION_SEVERITY.HIGH,
          domain: 'SECURITY',
          source: 'cognitivePolicyFacadeService',
          reason: 'Effect REDACT sugerido (declarativo).',
          required_by: ['SECURITY'],
          status: POLICY_OBLIGATION_STATUS.SIMULATED
        })
      );
    }

    const dedup = new Map();
    for (const o of obligations) {
      const k = `${o.type}:${o.domain}`;
      if (!dedup.has(k)) dedup.set(k, o);
    }
    const out = [...dedup.values()];

    try {
      console.info('[POLICY_OBLIGATION_COMPOSITION]', JSON.stringify({ count: out.length }));
    } catch (_e4) {}
    return out;
  } catch (_e5) {
    return obligations;
  }
}

function detectObligationCorrelations(obligations) {
  const correlations = [];
  const list = Array.isArray(obligations) ? obligations : [];
  const types = list.map((o) => o && o.type).filter(Boolean);

  if (types.includes('HITL_REQUIRED') && types.includes('AUDIT_REQUIRED')) {
    correlations.push({ type: 'audit_chain', severity: 'high' });
  }
  if (types.filter((t) => t === 'TRACE_REQUIRED').length > 1) {
    correlations.push({ type: 'redundant_trace', severity: 'low' });
  }
  const hitl = list.find((o) => o && o.type === 'HITL_REQUIRED');
  const limit = list.find((o) => o && o.type === 'LIMIT_AUTONOMY');
  if (hitl && limit) {
    correlations.push({ type: 'dominated_autonomy', severity: 'medium', detail: 'HITL dominates LIMIT_AUTONOMY' });
  }
  if (types.includes('SECURITY_REVIEW') && types.includes('TENANT_REVIEW')) {
    correlations.push({ type: 'governance_duty_cluster', severity: 'medium' });
  }
  try {
    console.info('[POLICY_OBLIGATION]', JSON.stringify({ action: 'correlations', count: correlations.length }));
  } catch (_e) {}
  return { correlations };
}

function resolveObligationPriority(obligations, arbitration, decision) {
  const list = Array.isArray(obligations) ? [...obligations] : [];
  const dom = arbitration && arbitration.winner && arbitration.winner.domain ? String(arbitration.winner.domain).toUpperCase() : null;
  const risk = decision && decision.risk_level ? _normSeverity(decision.risk_level) : 'safe';

  list.sort((a, b) => {
    const sr = (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0);
    if (sr !== 0) return sr;
    const tr = (TYPE_RANK[b.type] || 0) - (TYPE_RANK[a.type] || 0);
    if (tr !== 0) return tr;
    if (dom) {
      const ad = a.domain === dom ? 1 : 0;
      const bd = b.domain === dom ? 1 : 0;
      if (bd !== ad) return bd - ad;
    }
    if (risk === 'critical') {
      if (a.domain === 'SAFETY' && b.domain !== 'SAFETY') return -1;
      if (b.domain === 'SAFETY' && a.domain !== 'SAFETY') return 1;
    }
    return 0;
  });

  const dominant_obligation = list[0] ? { type: list[0].type, obligation_id: list[0].obligation_id, severity: list[0].severity } : null;

  const priority_map = {};
  list.forEach((o, i) => {
    priority_map[o.obligation_id] = list.length - i;
  });

  try {
    console.info('[POLICY_OBLIGATION_PRIORITY]', JSON.stringify({ dominant: dominant_obligation && dominant_obligation.type, count: list.length }));
  } catch (_e2) {}

  return { ordered: list, dominant_obligation, priority_map };
}

function appendObligationTrace(obligation, entry) {
  const base =
    obligation && typeof obligation === 'object'
      ? { ...obligation, metadata: { ...(obligation.metadata || {}) } }
      : createPolicyObligation({ type: POLICY_OBLIGATION_TYPES.AUDIT_REQUIRED, reason: 'placeholder' });
  const meta = base.metadata || {};
  const trace = Array.isArray(meta.obligation_trace) ? [...meta.obligation_trace] : [];
  trace.push({
    type: _safeStr(entry && entry.type, 32).toUpperCase() || 'OBLIGATION',
    message: _safeStr(entry && entry.message, 2000),
    timestamp: _nowIso(),
    detail: entry && entry.detail && typeof entry.detail === 'object' ? entry.detail : undefined
  });
  meta.obligation_trace = trace;
  base.metadata = meta;
  try {
    console.info('[POLICY_OBLIGATION_TRACE]', JSON.stringify({ obligation_id: base.obligation_id, step: trace.length }));
  } catch (_e) {}
  return base;
}

function _appendReportTrace(reportTrace, entry) {
  const list = Array.isArray(reportTrace) ? [...reportTrace] : [];
  list.push({
    type: _safeStr(entry && entry.type, 32) || 'OBLIGATION',
    message: _safeStr(entry && entry.message, 2000),
    timestamp: _nowIso()
  });
  try {
    console.info('[POLICY_OBLIGATION_TRACE]', JSON.stringify({ report: true, message: list[list.length - 1].message?.slice(0, 120) }));
  } catch (_e) {}
  return list;
}

function buildDemoCompositionInput() {
  const cognitivePolicyFacadeService = require('./cognitivePolicyFacadeService');
  const cognitivePolicyArbitrationService = require('./cognitivePolicyArbitrationService');
  const sig = require('./cognitivePolicySignalService');
  const ctx = { tenant_scope: 'company_id', runtime_scope: 'dashboard_chat' };
  const signals = [
    sig.adaptCsiSignal({ csi: 55, status: 'warning', unavailable: false }, ctx),
    sig.adaptDriftSignal({ recent_drift_events: 6, high_severity: 0 }, ctx),
    sig.adaptConsensusSignal({ consensus_score: 0.7, divergence_events: 4 }, ctx),
    sig.adaptCalibrationSignal({ overconfidence_events: 6, underconfidence_events: 0 }, ctx),
    sig.adaptIntegritySignal({ integrity_failures: 1, status: 'warning', block_mode: false }, ctx),
    sig.adaptSafetySignal({ risk_score: 0.85, risk_level: 'critical', engine_enabled: true }, ctx)
  ];
  const evaluation = cognitivePolicyFacadeService.evaluatePolicyFacade({
    signals,
    context: { autonomy_degraded: true, tenant_anomaly: true },
    channel: 'dashboard_chat',
    tenant: { id: 'demo', anomaly: true }
  });
  const arbitration = cognitivePolicyArbitrationService.generatePolicyArbitrationReport();
  return {
    signals: evaluation.decision.signals,
    decision: evaluation.decision,
    arbitration,
    context: { autonomy_degraded: true, tenant_anomaly: true },
    tenant: { id: 'demo', anomaly: true }
  };
}

function generateObligationReport(input) {
  const composedInput = input != null && typeof input === 'object' ? input : buildDemoCompositionInput();
  let obligations = composePolicyObligations(composedInput);
  const { correlations } = detectObligationCorrelations(obligations);
  const { ordered, dominant_obligation, priority_map } = resolveObligationPriority(
    obligations,
    composedInput.arbitration,
    composedInput.decision
  );

  obligations = ordered.map((o, idx) =>
    idx === 0
      ? appendObligationTrace(o, {
          type: 'OBLIGATION',
          message: dominant_obligation
            ? `${dominant_obligation.type} declared due to ${composedInput.arbitration && composedInput.arbitration.winner ? composedInput.arbitration.winner.domain : 'NORMATIVE'} dominance`
            : 'No dominant obligation',
          detail: { arbitration_dominance: composedInput.arbitration && composedInput.arbitration.winner }
        })
      : o
  );

  let trace = [];
  trace = _appendReportTrace(trace, {
    type: 'OBLIGATION',
    message: `Obligation report composed (${obligations.length} declarative duties)`
  });

  try {
    console.info('[POLICY_OBLIGATION]', JSON.stringify({ action: 'report', obligations: obligations.length, correlations: correlations.length }));
  } catch (_e) {}

  return {
    obligations,
    dominant_obligation,
    correlations,
    priority_map,
    trace,
    governance_duties: obligations.map((o) => ({
      obligation_id: o.obligation_id,
      duty: o.type,
      domain: o.domain,
      status: o.status
    }))
  };
}

function validateObligationReport(report) {
  const errors = [];
  try {
    if (!report || typeof report !== 'object') {
      errors.push({ path: '', message: 'report_missing' });
      return { valid: false, errors };
    }
    if (!Array.isArray(report.obligations)) errors.push({ path: 'obligations', message: 'not_array' });
    else {
      const typeSet = new Set(Object.values(POLICY_OBLIGATION_TYPES));
      const sevSet = new Set(Object.values(POLICY_OBLIGATION_SEVERITY));
      const statusSet = new Set(Object.values(POLICY_OBLIGATION_STATUS));
      for (let i = 0; i < report.obligations.length; i++) {
        const o = report.obligations[i];
        if (!o || typeof o !== 'object') {
          errors.push({ path: `obligations[${i}]`, message: 'invalid' });
          continue;
        }
        if (!typeSet.has(o.type)) errors.push({ path: `obligations[${i}].type`, message: 'invalid_type' });
        if (!sevSet.has(o.severity)) errors.push({ path: `obligations[${i}].severity`, message: 'invalid_severity' });
        if (!statusSet.has(o.status)) errors.push({ path: `obligations[${i}].status`, message: 'invalid_status' });
        if (!_safeStr(o.domain, 1)) errors.push({ path: `obligations[${i}].domain`, message: 'invalid_domain' });
      }
    }
    if (report.dominant_obligation && !report.dominant_obligation.type) {
      errors.push({ path: 'dominant_obligation', message: 'invalid' });
    }
    if (!Array.isArray(report.correlations)) errors.push({ path: 'correlations', message: 'not_array' });
    if (!report.priority_map || typeof report.priority_map !== 'object') errors.push({ path: 'priority_map', message: 'missing' });
    if (!Array.isArray(report.trace)) errors.push({ path: 'trace', message: 'not_array' });
  } catch (e) {
    errors.push({ path: '', message: _safeStr(e && e.message, 200) });
  }
  return { valid: errors.length === 0, errors };
}

function generatePolicyObligationSnapshot() {
  return {
    generated_at: _nowIso(),
    supported_obligations: [...Object.values(POLICY_OBLIGATION_TYPES)],
    severity_levels: [...Object.values(POLICY_OBLIGATION_SEVERITY)],
    status_types: [...Object.values(POLICY_OBLIGATION_STATUS)],
    composition_rules: COMPOSITION_RULES.map((r) => ({ ...r }))
  };
}

function getPolicyObligationDashboardSummary() {
  if (!isPolicyObligationsEnabled()) {
    return {
      enabled: false,
      code: 'POLICY_OBLIGATIONS_DISABLED',
      message: 'Defina IMPETUS_POLICY_OBLIGATIONS_ENABLED=true para a camada declarativa de obrigações.'
    };
  }
  const report = generateObligationReport();
  const validation = validateObligationReport(report);
  return {
    enabled: true,
    generated_at: _nowIso(),
    obligations_declared_count: report.obligations.length,
    dominant_obligation_type: report.dominant_obligation?.type ?? '—',
    dominant_severity: report.dominant_obligation?.severity ?? '—',
    obligation_correlations_count: report.correlations.length,
    governance_duties_count: report.governance_duties.length,
    validation_ok: validation.valid,
    trace_steps: report.trace.length
  };
}

function generatePolicyObligationAdminPayload() {
  return {
    snapshot: generatePolicyObligationSnapshot(),
    demo_report: generateObligationReport()
  };
}

module.exports = {
  POLICY_OBLIGATION_STATUS,
  POLICY_OBLIGATION_SEVERITY,
  POLICY_OBLIGATION_TYPES,
  COMPOSITION_RULES,
  isPolicyObligationsEnabled,
  createPolicyObligation,
  composePolicyObligations,
  detectObligationCorrelations,
  resolveObligationPriority,
  appendObligationTrace,
  generateObligationReport,
  validateObligationReport,
  generatePolicyObligationSnapshot,
  getPolicyObligationDashboardSummary,
  generatePolicyObligationAdminPayload,
  buildDemoCompositionInput
};
