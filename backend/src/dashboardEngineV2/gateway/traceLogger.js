'use strict';

/**
 * Trace logger — emite logs estruturados em NDJSON sobre stdout.
 * Sem dependências externas. Sem persistência (pode ser ligada ao
 * eventAuditLogger em fases posteriores).
 *
 * Eventos:
 *   [DASHBOARD_ENGINE_TRACE] — execução por request (engine, identity, latência)
 *   [DASHBOARD_ENGINE_DIFF]  — diff A vs B em shadow/on
 *   [DASHBOARD_ENGINE_ERROR] — erros internos do gateway
 *
 * Nível controlado por `IMPETUS_DASHBOARD_ENGINE_LOG_LEVEL`:
 *   silent: nada
 *   info:   trace + diff + error
 *   debug:  + identity_trace + widgets_denied
 */

function _now() {
  return new Date().toISOString();
}

function _redactUser(user) {
  if (!user) return null;
  return {
    user_id: user.id ?? null,
    company_id: user.company_id ?? null,
    role: user.role ?? null,
    job_title: user.job_title ? String(user.job_title).slice(0, 80) : null,
    functional_area: user.functional_area ?? null,
    hierarchy_level: user.hierarchy_level ?? null,
    has_dashboard_profile: !!user.dashboard_profile
  };
}

function _safe(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (_) {
    return null;
  }
}

function logTrace({ flags, traceId, user, primaryEngine, latencyMs, normalized, ranShadow, error, directive }) {
  const level = (flags && flags.logLevel) || 'info';
  if (level === 'silent') return;
  const payload = {
    event: '[DASHBOARD_ENGINE_TRACE]',
    timestamp: _now(),
    trace_id: traceId,
    primary_engine: primaryEngine,
    ran_shadow: !!ranShadow,
    latency_ms: latencyMs,
    user: _redactUser(user),
    flags: flags ? { v2: flags.v2, shadow: flags.shadow } : null,
    directive: directive ? { mode: directive.mode, source: directive.source, detail: directive.detail } : null,
    summary: {
      area: normalized?.identity?.area || null,
      function_type: normalized?.identity?.function_type || null,
      primary_axis: normalized?.identity?.primary_axis || null,
      widget_ids: Array.isArray(normalized?.modulos) ? normalized.modulos.map((m) => m.id) : [],
      capabilities_count: Array.isArray(normalized?.identity?.capabilities) ? normalized.identity.capabilities.length : 0,
      widgets_denied_count: Array.isArray(normalized?.explainability?.widgets_denied) ? normalized.explainability.widgets_denied.length : 0
    },
    error: error ? String(error.message || error) : null
  };
  if (level === 'debug') {
    payload.identity_trace = normalized?.identity?.trace || null;
    payload.widgets_denied = _safe(normalized?.explainability?.widgets_denied);
    payload.rationale_human = normalized?.explainability?.rationale_human || null;
  }
  try {
    console.log(JSON.stringify(payload));
  } catch (_) {
    // sem-fail
  }
}

function logDiff({ flags, traceId, user, diff }) {
  const level = (flags && flags.logLevel) || 'info';
  if (level === 'silent') return;
  const payload = {
    event: '[DASHBOARD_ENGINE_DIFF]',
    timestamp: _now(),
    trace_id: traceId,
    user: _redactUser(user),
    diff: {
      same_top_widget: diff.same_top_widget,
      top3_changes: diff.top3_changes,
      critical_divergence: diff.critical_divergence,
      jaccard_widgets: diff.jaccard_widgets,
      rank_correlation: diff.rank_correlation,
      counts: diff.counts,
      area_match: diff.area_match,
      area_a: diff.area_a,
      area_b: diff.area_b,
      function_b: diff.function_b,
      primary_axis_b: diff.primary_axis_b,
      profile_code_a: diff.profile_code_a,
      profile_code_b: diff.profile_code_b,
      signature_a: diff.signature_a,
      signature_b: diff.signature_b
    }
  };
  if (level === 'debug') {
    payload.diff.widgets_only_a = diff.widgets_only_a;
    payload.diff.widgets_only_b = diff.widgets_only_b;
    payload.diff.sequence_a = diff.sequence_a;
    payload.diff.sequence_b = diff.sequence_b;
    payload.diff.capabilities_a = diff.capabilities_a;
    payload.diff.capabilities_b = diff.capabilities_b;
  }
  try {
    console.log(JSON.stringify(payload));
  } catch (_) { /* no-op */ }
}

function logError({ flags, traceId, user, error, where }) {
  const level = (flags && flags.logLevel) || 'info';
  if (level === 'silent') return;
  try {
    console.error(JSON.stringify({
      event: '[DASHBOARD_ENGINE_ERROR]',
      timestamp: _now(),
      trace_id: traceId,
      where: where || 'unknown',
      user: _redactUser(user),
      error: error && error.message ? error.message : String(error || 'unknown')
    }));
  } catch (_) { /* no-op */ }
}

module.exports = { logTrace, logDiff, logError };
