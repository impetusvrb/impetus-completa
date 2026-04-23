'use strict';

/**
 * Behavioral Intelligence — perfis em memória, padrões de risco progressivo, complementar ao Risk Intelligence.
 * Apenas metadados (sem texto de pedidos). Isolamento por tenant (chave company_id:user_id).
 */

const observabilityService = require('./observabilityService');

const WINDOW_MS = Math.min(
  900000,
  Math.max(300000, parseInt(process.env.BEHAVIORAL_WINDOW_MS || '600000', 10))
);
const MAX_EVENTS = Math.min(80, Math.max(10, parseInt(process.env.BEHAVIORAL_MAX_EVENTS || '24', 10)));
const PROFILE_TTL_MS = Math.min(
  3600000,
  Math.max(600000, parseInt(process.env.BEHAVIORAL_PROFILE_TTL_MS || '1800000', 10))
);
const MAX_PROFILES = Math.min(20000, Math.max(2000, parseInt(process.env.BEHAVIORAL_MAX_PROFILES || '8000', 10)));

const EVENT_TYPES = new Set([
  'ACCESS_ATTEMPT',
  'POLICY_BLOCK',
  'GOVERNANCE_BLOCK',
  'INCIDENT_GENERATED',
  'RESPONSE_LIMITED'
]);

const SCORE_BOOST = { LOW: 0, MEDIUM: 7, HIGH: 16, CRITICAL: 24 };

/** @type {Map<string, object>} */
const profiles = new Map();

let pruneCounter = 0;

const globalMetrics = {
  patterns_detected_total: 0,
  evaluations_total: 0,
  suspicious_profiles_active: 0
};

function profileKey(companyId, userId) {
  if (!companyId || !userId) return null;
  return `${String(companyId)}:${String(userId)}`;
}

function isBlockType(t) {
  return t === 'POLICY_BLOCK' || t === 'GOVERNANCE_BLOCK';
}

function sanitizeMeta(ctx) {
  if (!ctx || typeof ctx !== 'object') return {};
  const out = {};
  if (ctx.traceId != null) out.trace_id = String(ctx.traceId).slice(0, 80);
  if (ctx.module != null) out.module = String(ctx.module).slice(0, 64);
  if (ctx.reason != null) out.reason = String(ctx.reason).slice(0, 80);
  if (ctx.kind != null) out.kind = String(ctx.kind).slice(0, 48);
  if (ctx.mode != null) out.mode = String(ctx.mode).slice(0, 32);
  if (ctx.severityHint != null) {
    const s = Number(ctx.severityHint);
    if (s >= 1 && s <= 4) out.severity_hint = s;
  }
  return out;
}

function pruneStaleProfiles() {
  const now = Date.now();
  for (const [k, p] of profiles.entries()) {
    if (now - (p.last_action_at || 0) > PROFILE_TTL_MS) profiles.delete(k);
  }
}

function evictIfNeeded() {
  if (profiles.size <= MAX_PROFILES) return;
  const drop = Math.max(50, Math.floor(profiles.size * 0.08));
  const keys = [...profiles.keys()].slice(0, drop);
  for (const k of keys) profiles.delete(k);
}

/**
 * @param {object} profile
 * @returns {{ behavior_risk: string, pattern_detected: boolean, pattern_type: string|null, risk_trend: string }}
 */
function evaluateBehaviorPattern(profile) {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const raw = Array.isArray(profile.recent_actions) ? profile.recent_actions : [];
  const actions = raw.filter((a) => a && typeof a.t === 'number' && a.t >= windowStart).slice(-MAX_EVENTS);

  const blocks = actions.filter((a) => isBlockType(a.type));
  const accesses = actions.filter((a) => a.type === 'ACCESS_ATTEMPT');
  const incidents = actions.filter((a) => a.type === 'INCIDENT_GENERATED');
  const limited = actions.filter((a) => a.type === 'RESPONSE_LIMITED');

  profile.attempt_count_window = accesses.length;
  profile.last_action_at = profile.last_action_at || now;

  let risk_trend = 'stable';
  if (actions.length >= 4) {
    const mid = Math.floor(actions.length / 2);
    const firstHalf = actions.slice(0, mid);
    const secondHalf = actions.slice(mid);
    const b1 = firstHalf.filter((a) => isBlockType(a.type)).length;
    const b2 = secondHalf.filter((a) => isBlockType(a.type)).length;
    if (b2 >= b1 + 2) risk_trend = 'increasing';
    if (b2 >= 3 || (b1 + b2 >= 4 && b2 >= 2)) risk_trend = 'critical';
  }

  const tail = actions.slice(-6);
  let consecutiveBlocks = 0;
  for (let i = tail.length - 1; i >= 0 && isBlockType(tail[i].type); i--) consecutiveBlocks++;

  let escalation = false;
  for (let i = 0; i < actions.length - 1; i++) {
    if (isBlockType(actions[i].type) && actions[i + 1].type === 'INCIDENT_GENERATED') {
      escalation = true;
      break;
    }
  }

  const repeatedBlocks = blocks.length >= 3 || consecutiveBlocks >= 2;
  const probing =
    accesses.length >= 8 && blocks.length >= 1 && blocks.length <= 3 && !repeatedBlocks;

  let behavior_risk = 'LOW';
  let pattern_detected = false;
  let pattern_type = null;

  if (blocks.length >= 4 || (blocks.length >= 3 && incidents.length >= 1) || risk_trend === 'critical') {
    behavior_risk = 'CRITICAL';
    pattern_detected = true;
    pattern_type = repeatedBlocks ? 'REPEATED_ATTEMPT' : 'ESCALATION';
  } else if (blocks.length >= 2 || (blocks.length >= 1 && accesses.length >= 8) || incidents.length >= 2) {
    behavior_risk = 'HIGH';
    pattern_detected = true;
    if (escalation) pattern_type = 'ESCALATION';
    else if (probing) pattern_type = 'PROBING';
    else pattern_type = 'REPEATED_ATTEMPT';
  } else if (
    (blocks.length >= 1 && accesses.length >= 5) ||
    (incidents.length >= 1 && accesses.length >= 6) ||
    limited.length >= 3
  ) {
    behavior_risk = 'MEDIUM';
    pattern_detected = true;
    pattern_type = probing ? 'PROBING' : 'REPEATED_ATTEMPT';
  }

  if (pattern_type == null && pattern_detected) pattern_type = 'REPEATED_ATTEMPT';

  profile.risk_trend = risk_trend;
  return { behavior_risk, pattern_detected, pattern_type, risk_trend };
}

/**
 * @param {string} eventType
 * @param {object} context — userId, companyId obrigatórios; metadados opcionais
 */
function trackUserAction(eventType, context) {
  const type = String(eventType || '').toUpperCase();
  if (!EVENT_TYPES.has(type)) return;

  const userId = context?.userId != null ? String(context.userId) : null;
  const companyId = context?.companyId != null ? String(context.companyId) : null;
  const k = profileKey(companyId, userId);
  if (!k) return;

  if (++pruneCounter % 50 === 0) {
    pruneStaleProfiles();
  }

  let p = profiles.get(k);
  if (!p) {
    p = {
      user_id: userId,
      company_id: companyId,
      recent_actions: [],
      risk_trend: 'stable',
      attempt_count_window: 0,
      last_action_at: Date.now()
    };
    profiles.set(k, p);
    evictIfNeeded();
  }

  const now = Date.now();
  const entry = { t: now, type, meta: sanitizeMeta(context) };
  p.recent_actions.push(entry);
  const cut = now - WINDOW_MS;
  p.recent_actions = p.recent_actions.filter((a) => a.t >= cut).slice(-MAX_EVENTS);
  p.last_action_at = now;

  const evalResult = evaluateBehaviorPattern(p);
  p._last_eval = evalResult;
  if (
    evalResult.pattern_detected &&
    (evalResult.behavior_risk === 'HIGH' || evalResult.behavior_risk === 'CRITICAL')
  ) {
    const alertGap = Math.min(600000, Math.max(30000, parseInt(process.env.BEHAVIORAL_ALERT_COOLDOWN_MS || '60000', 10)));
    if (now - (p._last_behavior_alert_at || 0) > alertGap) {
      p._last_behavior_alert_at = now;
      globalMetrics.patterns_detected_total += 1;
      observabilityService.logEvent('WARN', 'BEHAVIORAL_PATTERN', {
        company_id: companyId,
        user_id: userId,
        details: {
          behavior_risk: evalResult.behavior_risk,
          pattern_type: evalResult.pattern_type,
          risk_trend: evalResult.risk_trend,
          attempt_count_window: p.attempt_count_window,
          trigger_event: type
        }
      });
    }
  }
}

/**
 * Avaliação para o motor adaptativo (lê perfil atual sem novo track).
 */
function getEvaluationForAdaptive(companyId, userId) {
  globalMetrics.evaluations_total += 1;
  const k = profileKey(companyId, userId);
  if (!k) {
    return {
      behavior_risk: 'LOW',
      pattern_detected: false,
      pattern_type: null,
      risk_trend: 'stable',
      score_boost: 0,
      block_message_pt: null
    };
  }
  let p = profiles.get(k);
  if (!p) {
    return {
      behavior_risk: 'LOW',
      pattern_detected: false,
      pattern_type: null,
      risk_trend: 'stable',
      score_boost: 0,
      block_message_pt: null
    };
  }

  const ev = evaluateBehaviorPattern(p);
  const score_boost = SCORE_BOOST[ev.behavior_risk] ?? 0;

  const block_message_pt =
    ev.behavior_risk === 'CRITICAL' && ev.pattern_detected
      ? 'Política IMPETUS: padrão comportamental anómalo detetado (tentativas repetidas ou escalação). A resposta assistida foi temporariamente bloqueada. Contacte o supervisor ou o apoio IMPETUS.'
      : null;

  return {
    ...ev,
    score_boost,
    block_message_pt,
    attempt_count_window: p.attempt_count_window
  };
}

function getProfileSnapshot(companyId, userId) {
  const k = profileKey(companyId, userId);
  if (!k || !profiles.has(k)) return null;
  const p = profiles.get(k);
  const ev = evaluateBehaviorPattern({ ...p, recent_actions: [...p.recent_actions] });
  return {
    user_id: p.user_id,
    company_id: p.company_id,
    recent_actions: p.recent_actions.map((a) => ({
      t: a.t,
      type: a.type,
      meta: a.meta
    })),
    risk_trend: ev.risk_trend,
    attempt_count_window: p.attempt_count_window,
    last_action_at: p.last_action_at,
    last_evaluation: ev
  };
}

function getMetricsSnapshot() {
  let suspicious = 0;
  for (const p of profiles.values()) {
    const ev = evaluateBehaviorPattern(p);
    if (ev.behavior_risk === 'HIGH' || ev.behavior_risk === 'CRITICAL') suspicious++;
  }
  globalMetrics.suspicious_profiles_active = suspicious;
  return {
    ...globalMetrics,
    profiles_active: profiles.size,
    window_ms: WINDOW_MS,
    max_events: MAX_EVENTS
  };
}

function resetForTests() {
  profiles.clear();
  globalMetrics.patterns_detected_total = 0;
  globalMetrics.evaluations_total = 0;
  globalMetrics.suspicious_profiles_active = 0;
  pruneCounter = 0;
}

module.exports = {
  EVENT_TYPES,
  WINDOW_MS,
  MAX_EVENTS,
  PROFILE_TTL_MS,
  trackUserAction,
  evaluateBehaviorPattern,
  getEvaluationForAdaptive,
  getProfileSnapshot,
  getMetricsSnapshot,
  resetForTests
};
