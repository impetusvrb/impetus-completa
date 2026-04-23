'use strict';

/**
 * AI Learning Feedback Engine — aprendizagem assistida a partir de HITL.
 * Metadados apenas; sem fine-tuning; ajustes de governança explícitos e reversíveis via env.
 */

const observabilityService = require('./observabilityService');

function isFeedbackCaptureEnabled() {
  return process.env.AI_LEARNING_FEEDBACK_ENABLED !== 'false';
}

function isAdjustmentsEnabled() {
  return process.env.AI_LEARNING_ADJUSTMENTS_ENABLED !== 'false';
}

const TTL_MS = Math.max(
  3600000,
  parseInt(process.env.AI_LEARNING_FEEDBACK_TTL_MS || String(7 * 24 * 3600 * 1000), 10)
);
const MAX_USER_KEYS = parseInt(process.env.AI_LEARNING_FEEDBACK_MAX_KEYS || '5000', 10);
const MAX_EVENTS_PER_USER = Math.min(
  500,
  Math.max(20, parseInt(process.env.AI_LEARNING_FEEDBACK_MAX_EVENTS || '200', 10))
);
const DAY_MS = 24 * 3600 * 1000;

/** @type {Map<string, object>} */
const feedbackStats = new Map();

/** @type {{ t: number, company_id: string, event: string, details: object }[]} */
const learningAuditRing = [];
const MAX_AUDIT = 400;

const VALID = new Set(['ACCEPTED', 'REJECTED', 'PARTIALLY_ACCEPTED']);

function tenantUserKey(companyId, userId) {
  return `${String(companyId)}::${String(userId)}`;
}

function sanitizeModule(m) {
  if (m == null || m === '') return 'unknown';
  return String(m).replace(/[^\w.\-]/g, '_').slice(0, 96) || 'unknown';
}

function emptyStats(userId, companyId) {
  return {
    user_id: String(userId),
    company_id: String(companyId),
    accepted_count: 0,
    rejected_count: 0,
    partial_count: 0,
    patterns: [],
    last_feedback_at: null,
    events: []
  };
}

function pruneEvents(entry) {
  const cut = Date.now() - TTL_MS;
  if (!entry.events?.length) return;
  entry.events = entry.events.filter((e) => e.t >= cut);
  while (entry.events.length > MAX_EVENTS_PER_USER) entry.events.shift();
}

function recomputeCounters(entry) {
  entry.accepted_count = 0;
  entry.rejected_count = 0;
  entry.partial_count = 0;
  for (const e of entry.events) {
    if (e.status === 'ACCEPTED') entry.accepted_count += 1;
    else if (e.status === 'REJECTED') entry.rejected_count += 1;
    else if (e.status === 'PARTIALLY_ACCEPTED') entry.partial_count += 1;
  }
}

function evictIfNeeded() {
  while (feedbackStats.size > MAX_USER_KEYS) {
    const first = feedbackStats.keys().next().value;
    feedbackStats.delete(first);
  }
}

function pushPattern(entry, rec) {
  const arr = entry.patterns || (entry.patterns = []);
  arr.push(rec);
  while (arr.length > 12) arr.shift();
}

function pushAudit(companyId, event, details) {
  learningAuditRing.push({
    t: Date.now(),
    company_id: String(companyId || ''),
    event: String(event).slice(0, 64),
    details: details && typeof details === 'object' ? { ...details } : {}
  });
  while (learningAuditRing.length > MAX_AUDIT) learningAuditRing.shift();
}

/**
 * @param {string|null} trace_id
 * @param {string} validation_status
 * @param {{ user_id: string, company_id: string, module_name?: string|null, operation_type?: string|null }} context
 */
function captureFeedback(trace_id, validation_status, context) {
  if (!isFeedbackCaptureEnabled() || !context?.user_id || !context?.company_id) return;

  const status = normalizeStatus(validation_status);
  if (!status) return;

  const k = tenantUserKey(context.company_id, context.user_id);
  if (!feedbackStats.has(k)) {
    feedbackStats.set(k, emptyStats(context.user_id, context.company_id));
    evictIfNeeded();
  }
  const entry = feedbackStats.get(k);
  const mod = sanitizeModule(context.module_name);
  const op =
    context.operation_type != null && context.operation_type !== ''
      ? String(context.operation_type).slice(0, 96)
      : null;

  entry.events.push({
    t: Date.now(),
    status,
    module: mod,
    operation_type: op,
    trace_tail: trace_id != null ? String(trace_id).replace(/[^a-f0-9-]/gi, '').slice(-12) : null
  });
  pruneEvents(entry);
  recomputeCounters(entry);
  entry.last_feedback_at = new Date().toISOString();

  pushAudit(context.company_id, 'FEEDBACK_CAPTURED', {
    status,
    module: mod,
    has_operation: !!op
  });

  observabilityService.logEvent('INFO', 'AI_LEARNING_FEEDBACK', {
    company_id: context.company_id,
    user_id: context.user_id,
    details: {
      status,
      module: mod,
      adjustment: 'captured'
    }
  });
}

function normalizeStatus(raw) {
  const u = String(raw || '')
    .trim()
    .toUpperCase();
  if (u === 'ADJUSTED') return 'PARTIALLY_ACCEPTED';
  if (VALID.has(u)) return u;
  return null;
}

/**
 * @param {{ companyId: string, userId: string, module_name?: string|null, operation_type?: string|null }} scope
 * @returns {number} 0–100
 */
function getAiConfidenceScore(scope) {
  const k = tenantUserKey(scope.companyId, scope.userId);
  const entry = feedbackStats.get(k);
  if (!entry || !entry.events.length) return 80;

  const mod = scope.module_name != null ? sanitizeModule(scope.module_name) : null;
  const op = scope.operation_type != null ? String(scope.operation_type).slice(0, 96) : null;

  let ev = entry.events;
  if (mod) ev = ev.filter((e) => e.module === mod);
  if (op) ev = ev.filter((e) => e.operation_type === op);
  if (!ev.length) ev = entry.events;

  const recent = ev.slice(-18);
  let wSum = 0;
  let w = 0;
  for (let i = 0; i < recent.length; i += 1) {
    const e = recent[i];
    const weight = 0.65 + (i / recent.length) * 0.35;
    let score = 0.55;
    if (e.status === 'ACCEPTED') score = 1;
    else if (e.status === 'REJECTED') score = 0.08;
    else if (e.status === 'PARTIALLY_ACCEPTED') score = 0.52;
    wSum += score * weight;
    w += weight;
  }
  let base = w > 0 ? (wSum / w) * 100 : 80;

  if (op && /write|delete|mutat|exec|approve|payment/i.test(op)) base -= 4;
  return Math.max(0, Math.min(100, Math.round(base * 10) / 10));
}

/**
 * @param {{ companyId?: string, userId?: string, module_name?: string|null }} [scope]
 */
function analyzeFeedbackPatterns(scope = {}) {
  const companyId = scope.companyId != null ? String(scope.companyId) : null;
  const userId = scope.userId != null ? String(scope.userId) : null;
  const wantMod = scope.module_name != null ? sanitizeModule(scope.module_name) : null;

  let events = [];
  if (companyId && userId) {
    const entry = feedbackStats.get(tenantUserKey(companyId, userId));
    events = entry?.events ? [...entry.events] : [];
  } else {
    for (const e of feedbackStats.values()) {
      if (companyId && e.company_id !== companyId) continue;
      events.push(...(e.events || []));
    }
  }
  const cut = Date.now() - TTL_MS;
  events = events.filter((e) => e.t >= cut);
  if (wantMod) events = events.filter((e) => e.module === wantMod);

  const n = events.length;
  if (n < 5) {
    return { issue_detected: false, issue_type: null, severity: 'LOW' };
  }

  let acc = 0;
  let rej = 0;
  let part = 0;
  for (const e of events) {
    if (e.status === 'ACCEPTED') acc += 1;
    else if (e.status === 'REJECTED') rej += 1;
    else part += 1;
  }
  const acceptRate = acc / n;
  const rejectRate = rej / n;
  const partialRate = part / n;

  let issue_type = null;
  let issue_detected = false;

  if (acceptRate < 0.42 && n >= 8) {
    issue_detected = true;
    issue_type = 'LOW_ACCURACY';
  } else if (partialRate >= 0.28 && n >= 6) {
    issue_detected = true;
    issue_type = 'MISCLASSIFICATION';
  } else if (rejectRate >= 0.48 && acceptRate >= 0.15 && n >= 8) {
    issue_detected = true;
    issue_type = 'OVER_RESTRICTION';
  }

  let severity = 'LOW';
  if (issue_detected) {
    if (rejectRate >= 0.62 || acceptRate <= 0.28) severity = 'HIGH';
    else if (rejectRate >= 0.38 || acceptRate <= 0.48) severity = 'MEDIUM';
  }

  if (issue_detected && userId && companyId) {
    const ent = feedbackStats.get(tenantUserKey(companyId, userId));
    if (ent) {
      pushPattern(ent, {
        at: new Date().toISOString(),
        issue_type,
        severity,
        module: wantMod || 'aggregate'
      });
    }
  }

  return { issue_detected, issue_type, severity };
}

/**
 * Sinais determinísticos para o motor adaptativo (sem alterar políticas persistidas).
 * @param {{ companyId: string, userId: string, module?: string|null, operation_type?: string|null }} params
 */
function getLearningGovernanceSignals(params) {
  const confidence_score = getAiConfidenceScore({
    companyId: params.companyId,
    userId: params.userId,
    module_name: params.module,
    operation_type: params.operation_type
  });

  const patterns = analyzeFeedbackPatterns({
    companyId: params.companyId,
    userId: params.userId,
    module_name: params.module
  });

  if (!isAdjustmentsEnabled()) {
    return {
      confidence_score,
      risk_score_boost: 0,
      require_validation_extra: false,
      response_mode_tighten: 0,
      adjustment_applied: null,
      patterns
    };
  }

  let risk_score_boost = 0;
  let require_validation_extra = false;
  let response_mode_tighten = 0;
  const reason_codes = [];

  if (confidence_score < 42) {
    risk_score_boost = Math.min(12, Math.round((100 - confidence_score) * 0.14));
    require_validation_extra = true;
    response_mode_tighten = 2;
    reason_codes.push('LOW_CONFIDENCE_STRICT');
  } else if (confidence_score < 58) {
    risk_score_boost = Math.min(8, Math.round((72 - confidence_score) * 0.22));
    require_validation_extra = true;
    response_mode_tighten = 1;
    reason_codes.push('LOW_CONFIDENCE_VALIDATION');
  } else if (patterns.issue_detected && patterns.severity === 'HIGH') {
    risk_score_boost = 6;
    require_validation_extra = true;
    response_mode_tighten = 1;
    reason_codes.push(`PATTERN_${patterns.issue_type || 'UNKNOWN'}`);
  } else if (patterns.issue_detected && patterns.severity === 'MEDIUM') {
    risk_score_boost = 3;
    require_validation_extra = true;
    reason_codes.push(`PATTERN_${patterns.issue_type || 'UNKNOWN'}`);
  }

  const adjustment_applied =
    reason_codes.length > 0 || risk_score_boost > 0
      ? {
          reason_codes,
          risk_score_boost,
          require_validation: require_validation_extra,
          response_mode_tighten,
          pattern: patterns.issue_detected ? patterns : null
        }
      : null;

  if (adjustment_applied) {
    pushAudit(params.companyId, 'GOVERNANCE_INFLUENCE', {
      confidence_score,
      risk_score_boost,
      require_validation: require_validation_extra,
      tighten: response_mode_tighten
    });
  }

  return {
    confidence_score,
    risk_score_boost,
    require_validation_extra,
    response_mode_tighten,
    adjustment_applied,
    patterns
  };
}

function getStatsSnapshot(companyId, userId) {
  const k = tenantUserKey(companyId, userId);
  const e = feedbackStats.get(k);
  if (!e) return null;
  pruneEvents(e);
  recomputeCounters(e);
  return {
    user_id: e.user_id,
    company_id: e.company_id,
    accepted_count: e.accepted_count,
    rejected_count: e.rejected_count,
    partial_count: e.partial_count,
    patterns: (e.patterns || []).slice(-8),
    last_feedback_at: e.last_feedback_at
  };
}

/**
 * Painel super_admin — agregados sem texto de utilizador.
 */
function getAdminSnapshot() {
  const byCompany = new Map();
  let total = 0;
  let acc = 0;
  let rej = 0;
  let part = 0;
  const moduleAgg = new Map();

  for (const entry of feedbackStats.values()) {
    pruneEvents(entry);
    recomputeCounters(entry);
    const cid = entry.company_id;
    const n = entry.accepted_count + entry.rejected_count + entry.partial_count;
    if (n === 0) continue;

    total += n;
    acc += entry.accepted_count;
    rej += entry.rejected_count;
    part += entry.partial_count;

    const row = byCompany.get(cid) || { company_id: cid, events: 0, accepted: 0, rejected: 0, partial: 0 };
    row.events += n;
    row.accepted += entry.accepted_count;
    row.rejected += entry.rejected_count;
    row.partial += entry.partial_count;
    byCompany.set(cid, row);

    for (const ev of entry.events || []) {
      const mk = `${cid}::${ev.module}`;
      const m = moduleAgg.get(mk) || { company_id: cid, module: ev.module, n: 0, rejected: 0, accepted: 0 };
      m.n += 1;
      if (ev.status === 'REJECTED') m.rejected += 1;
      if (ev.status === 'ACCEPTED') m.accepted += 1;
      moduleAgg.set(mk, m);
    }
  }

  const evolution = [];
  const now = Date.now();
  for (let d = 6; d >= 0; d -= 1) {
    const dayStart = now - d * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    let da = 0;
    let dr = 0;
    let dp = 0;
    for (const entry of feedbackStats.values()) {
      for (const ev of entry.events || []) {
        if (ev.t >= dayStart && ev.t < dayEnd) {
          if (ev.status === 'ACCEPTED') da += 1;
          else if (ev.status === 'REJECTED') dr += 1;
          else dp += 1;
        }
      }
    }
    evolution.push({
      day: new Date(dayStart).toISOString().slice(0, 10),
      accepted: da,
      rejected: dr,
      partial: dp
    });
  }

  const topModules = Array.from(moduleAgg.values())
    .filter((m) => m.n >= 3)
    .map((m) => ({
      ...m,
      rejection_rate: Math.round((m.rejected / m.n) * 1000) / 10
    }))
    .sort((a, b) => b.rejection_rate - a.rejection_rate)
    .slice(0, 15);

  const companies = Array.from(byCompany.values())
    .map((c) => ({
      ...c,
      acceptance_rate: c.events ? Math.round((c.accepted / c.events) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.events - a.events)
    .slice(0, 80);

  const globalPattern = analyzeFeedbackPatterns({});

  return {
    generated_at: new Date().toISOString(),
    flags: {
      feedback_capture_enabled: isFeedbackCaptureEnabled(),
      adjustments_enabled: isAdjustmentsEnabled(),
      ttl_ms: TTL_MS
    },
    global: {
      total_feedback_events: total,
      acceptance_rate: total ? Math.round((acc / total) * 1000) / 10 : null,
      rejection_rate: total ? Math.round((rej / total) * 1000) / 10 : null,
      partial_rate: total ? Math.round((part / total) * 1000) / 10 : null,
      pattern_hint: globalPattern.issue_detected ? globalPattern : null
    },
    quality_evolution: evolution,
    modules_highest_rejection: topModules,
    by_company: companies,
    recent_audit: learningAuditRing.slice(-40).map((a) => ({
      at: new Date(a.t).toISOString(),
      company_id: a.company_id,
      event: a.event,
      details: a.details
    }))
  };
}

function getLearningAuditTail(limit = 50) {
  const lim = Math.min(200, Math.max(1, limit));
  return learningAuditRing.slice(-lim);
}

function resetForTests() {
  feedbackStats.clear();
  learningAuditRing.length = 0;
}

/** Limpeza operacional (reversibilidade): esvazia aprendizagem in-memory do tenant. */
function clearCompanyLearning(companyId) {
  const c = String(companyId);
  for (const k of feedbackStats.keys()) {
    if (k.startsWith(`${c}::`)) feedbackStats.delete(k);
  }
  pushAudit(c, 'LEARNING_CLEARED', {});
}

module.exports = {
  isFeedbackCaptureEnabled,
  isAdjustmentsEnabled,
  captureFeedback,
  getAiConfidenceScore,
  analyzeFeedbackPatterns,
  getLearningGovernanceSignals,
  getStatsSnapshot,
  getAdminSnapshot,
  getLearningAuditTail,
  resetForTests,
  clearCompanyLearning,
  feedbackStats
};
