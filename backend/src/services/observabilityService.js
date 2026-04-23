'use strict';

/**
 * Observabilidade em memória: métricas, logs estruturados, saúde e alertas.
 * Passivo — não persiste em BD; não deve receber payloads sensíveis.
 */

const MAX_LOG_STRING = 500;
const MAX_DETAILS_DEPTH = 5;
const MAX_DETAILS_KEYS = 40;
const MAX_TENANT_ENTRIES = 2000;

const SENSITIVE_KEY_RE =
  /^(password|passwd|token|secret|authorization|cookie|set-cookie|cpf|cnpj|credit_card|pan|ssn)$/i;

const DEFAULT_THRESHOLDS = {
  consecutive_errors_critical: parseInt(process.env.OBS_CONSECUTIVE_ERRORS_CRITICAL || '5', 10),
  blocks_window_ms: parseInt(process.env.OBS_BLOCKS_WINDOW_MS || '60000', 10),
  blocks_warning_count: parseInt(process.env.OBS_BLOCKS_WARNING_COUNT || '25', 10),
  incidents_window_ms: parseInt(process.env.OBS_INCIDENTS_WINDOW_MS || '60000', 10),
  incidents_warning_count: parseInt(process.env.OBS_INCIDENTS_WARNING_COUNT || '15', 10)
};

const ALLOWED_INCREMENT_METRICS = new Set([
  'total_requests',
  'ai_responses_generated',
  'ai_responses_blocked',
  'policy_violations_count',
  'compliance_incidents_count',
  'errors_count'
]);

const metrics = {
  total_requests: 0,
  ai_responses_generated: 0,
  ai_responses_blocked: 0,
  policy_violations_count: 0,
  compliance_incidents_count: 0,
  errors_count: 0
};

const latencyCognitive = { sum: 0, count: 0 };

/** @type {Map<string, { requests: number, blocks: number, incidents: number }>} */
const byTenant = new Map();

let consecutiveErrors = 0;
/** @type {number[]} */
const blockTimestamps = [];
/** @type {number[]} */
const incidentTimestamps = [];

function tenantKey(companyId) {
  if (companyId == null || companyId === '') return null;
  return String(companyId);
}

function bumpTenant(companyId, field) {
  const k = tenantKey(companyId);
  if (!k) return;
  if (!byTenant.has(k) && byTenant.size >= MAX_TENANT_ENTRIES) return;
  const row = byTenant.get(k) || { requests: 0, blocks: 0, incidents: 0 };
  row[field] = (row[field] || 0) + 1;
  byTenant.set(k, row);
}

function noteIncidentForHealth() {
  incidentTimestamps.push(Date.now());
}

function noteBlockForHealth() {
  blockTimestamps.push(Date.now());
}

function pruneTimestamps(arr, windowMs) {
  const cut = Date.now() - windowMs;
  let i = 0;
  while (i < arr.length && arr[i] < cut) i++;
  if (i > 0) arr.splice(0, i);
}

function sanitizeDetails(val, depth = 0) {
  if (depth > MAX_DETAILS_DEPTH) return '[max_depth]';
  if (val == null) return val;
  if (typeof val === 'string') {
    const s = val.length > MAX_LOG_STRING ? `${val.slice(0, MAX_LOG_STRING)}…` : val;
    return s;
  }
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  if (Array.isArray(val)) {
    return val.slice(0, 20).map((x) => sanitizeDetails(x, depth + 1));
  }
  if (typeof val === 'object') {
    const out = {};
    let n = 0;
    for (const [k, v] of Object.entries(val)) {
      if (n >= MAX_DETAILS_KEYS) {
        out._truncated = true;
        break;
      }
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = '[redacted]';
      } else {
        out[k] = sanitizeDetails(v, depth + 1);
      }
      n++;
    }
    return out;
  }
  return String(val).slice(0, MAX_LOG_STRING);
}

/**
 * Log estruturado JSON (stdout). Não inclua texto de utilizador ou PII em `payload`.
 * @param {'INFO'|'WARN'|'ERROR'} level
 * @param {string} event
 * @param {object} payload
 */
function logEvent(level, event, payload = {}) {
  const line = {
    timestamp: new Date().toISOString(),
    level: level === 'WARN' || level === 'ERROR' ? level : 'INFO',
    event: String(event || 'UNKNOWN').slice(0, 80),
    trace_id: payload.trace_id != null ? String(payload.trace_id) : undefined,
    company_id: payload.company_id != null ? String(payload.company_id) : undefined,
    user_id: payload.user_id != null ? String(payload.user_id) : undefined,
    details: sanitizeDetails(payload.details != null ? payload.details : {})
  };
  if (Object.keys(line.details).length === 0) delete line.details;
  if (line.trace_id === undefined) delete line.trace_id;
  if (line.company_id === undefined) delete line.company_id;
  if (line.user_id === undefined) delete line.user_id;
  try {
    process.stdout.write(`${JSON.stringify(line)}\n`);
  } catch (_) {
    /* evita quebra do pipeline */
  }
}

function incrementMetric(name, delta = 1) {
  const n = String(name || '');
  if (!ALLOWED_INCREMENT_METRICS.has(n)) return;
  const d = Number.isFinite(delta) ? Math.max(0, Math.floor(delta)) : 1;
  metrics[n] = (metrics[n] || 0) + d;
}

/**
 * @param {string} name
 * @param {number} valueMs
 */
function recordLatency(name, valueMs) {
  if (name !== 'cognitive_council' && name !== 'average_response_time') return;
  const v = Number(valueMs);
  if (!Number.isFinite(v) || v < 0) return;
  latencyCognitive.sum += v;
  latencyCognitive.count += 1;
}

function getMetricsSnapshot() {
  const by_tenant = {};
  for (const [k, v] of byTenant.entries()) {
    by_tenant[k] = { ...v };
  }
  return {
    ...metrics,
    average_response_time:
      latencyCognitive.count > 0 ? Math.round(latencyCognitive.sum / latencyCognitive.count) : 0,
    by_tenant
  };
}

function resetConsecutiveErrors() {
  consecutiveErrors = 0;
}

function markCouncilStart({ traceId, companyId, userId, module }) {
  incrementMetric('total_requests');
  bumpTenant(companyId, 'requests');
  logEvent('INFO', 'AI_REQUEST', {
    trace_id: traceId,
    company_id: companyId || undefined,
    user_id: userId || undefined,
    details: { module: module || 'cognitive_council' }
  });
}

function markCouncilBlocked({ traceId, companyId, userId, reason, riskLevel, responseMode, policyEffect }) {
  incrementMetric('ai_responses_blocked');
  bumpTenant(companyId, 'blocks');
  noteBlockForHealth();
  resetConsecutiveErrors();
  logEvent('WARN', 'AI_BLOCKED', {
    trace_id: traceId,
    company_id: companyId || undefined,
    user_id: userId || undefined,
    details: {
      reason: reason || 'unknown',
      risk_level: riskLevel,
      response_mode: responseMode,
      policy_effect: policyEffect || null
    }
  });
}

function markCouncilSuccess({
  traceId,
  companyId,
  userId,
  durationMs,
  riskLevel,
  responseMode,
  policyEffect,
  policyViolation,
  complianceIncident,
  degraded,
  module
}) {
  resetConsecutiveErrors();
  incrementMetric('ai_responses_generated');
  recordLatency('cognitive_council', durationMs);
  if (policyViolation) {
    incrementMetric('policy_violations_count');
    bumpTenant(companyId, 'incidents');
    noteIncidentForHealth();
  }
  if (complianceIncident) {
    incrementMetric('compliance_incidents_count');
    bumpTenant(companyId, 'incidents');
    noteIncidentForHealth();
  }
  logEvent('INFO', 'AI_RESPONSE', {
    trace_id: traceId,
    company_id: companyId || undefined,
    user_id: userId || undefined,
    details: {
      duration_ms: durationMs,
      risk_level: riskLevel,
      response_mode: responseMode,
      policy_effect: policyEffect || 'none',
      policy_violation: !!policyViolation,
      compliance_incident: !!complianceIncident,
      degraded: !!degraded,
      module: module || 'cognitive_council'
    }
  });
}

function markPolicyApplied({
  traceId,
  companyId,
  userId,
  policyEffect,
  riskLevel,
  responseMode,
  violation
}) {
  logEvent('INFO', 'AI_POLICY_APPLIED', {
    trace_id: traceId,
    company_id: companyId || undefined,
    user_id: userId || undefined,
    details: {
      policy_effect: policyEffect || 'none',
      risk_level: riskLevel,
      response_mode: responseMode,
      violation: !!violation
    }
  });
}

function markCouncilException({ traceId, companyId, userId, err }) {
  consecutiveErrors += 1;
  incrementMetric('errors_count');
  const code = err && err.code ? String(err.code) : null;
  const msg = err && err.message ? String(err.message).slice(0, 240) : 'error';
  logEvent('ERROR', 'AI_ORCHESTRATOR_ERROR', {
    trace_id: traceId,
    company_id: companyId || undefined,
    user_id: userId || undefined,
    details: { error_code: code, message: msg }
  });
}

/**
 * Avalia alertas com base em janelas recentes e erros consecutivos.
 * @returns {{ status: 'OK'|'WARNING'|'CRITICAL', alerts: string[] }}
 */
function evaluateSystemHealth() {
  const alerts = [];
  const t = DEFAULT_THRESHOLDS;

  pruneTimestamps(blockTimestamps, t.blocks_window_ms);
  pruneTimestamps(incidentTimestamps, t.incidents_window_ms);

  if (consecutiveErrors >= t.consecutive_errors_critical) {
    alerts.push(
      `CRITICAL: ${consecutiveErrors} erros consecutivos no orquestrador (limite ${t.consecutive_errors_critical})`
    );
  }

  if (blockTimestamps.length >= t.blocks_warning_count) {
    alerts.push(
      `WARNING: pico de bloqueios (${blockTimestamps.length} em ${t.blocks_window_ms}ms) — rever políticas ou adaptive governance`
    );
  }

  if (incidentTimestamps.length >= t.incidents_warning_count) {
    alerts.push(
      `WARNING: pico de incidentes de policy/compliance (${incidentTimestamps.length} em ${t.incidents_window_ms}ms)`
    );
  }

  let status = 'OK';
  if (alerts.some((a) => a.startsWith('CRITICAL'))) status = 'CRITICAL';
  else if (alerts.length > 0) status = 'WARNING';

  return { status, alerts };
}

/** Resposta agregada para GET /system-health */
function getSystemHealthPayload() {
  const metricsSnapshot = getMetricsSnapshot();
  const { status, alerts } = evaluateSystemHealth();
  return {
    metrics: metricsSnapshot,
    system_status: status,
    alerts,
    timestamp: new Date().toISOString()
  };
}

/** Limpa janelas deslizantes (alertas); mantém contadores totais. */
function resetRollingWindows() {
  blockTimestamps.length = 0;
  incidentTimestamps.length = 0;
  consecutiveErrors = 0;
}

/** Reset completo (testes ou manutenção). */
function resetAllMetrics() {
  for (const k of Object.keys(metrics)) metrics[k] = 0;
  latencyCognitive.sum = 0;
  latencyCognitive.count = 0;
  byTenant.clear();
  resetRollingWindows();
}

module.exports = {
  logEvent,
  incrementMetric,
  recordLatency,
  getMetricsSnapshot,
  evaluateSystemHealth,
  getSystemHealthPayload,
  markCouncilStart,
  markCouncilBlocked,
  markCouncilSuccess,
  markPolicyApplied,
  markCouncilException,
  resetRollingWindows,
  resetAllMetrics,
  resetConsecutiveErrors,
  DEFAULT_THRESHOLDS
};
