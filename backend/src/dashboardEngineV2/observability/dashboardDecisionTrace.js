'use strict';

/**
 * DashboardDecisionTrace — registo estruturado da decisão de composição.
 *
 * Cada vez que o gateway resolve um dashboard, um trace é arquivado em
 * memória num buffer circular (último N por padrão 500) para inspecção
 * via API ou debug. NÃO substitui o log NDJSON do `traceLogger`; é uma
 * vista programática do mesmo facto.
 *
 * Forma do trace:
 *   {
 *     trace_id, timestamp, latency_ms,
 *     user: { id, company_id, role, area, function_type },
 *     directive: { mode, source, detail },
 *     identity: { primary_axis, axes_priority, capabilities },
 *     widgets: { selected: [...], denied: [...] },
 *     score_distribution: { min, max, median },
 *     rationale_human
 *   }
 */

const DEFAULT_BUFFER_SIZE = 500;

const _state = {
  buffer: [],
  size: DEFAULT_BUFFER_SIZE,
  enabled: true
};

function _now() { return Date.now(); }

function _percentile(values, p) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

function _summarizeScores(widgets) {
  const scores = (widgets || []).map((w) => Number(w.score)).filter((n) => Number.isFinite(n));
  if (scores.length === 0) return { count: 0, min: null, max: null, median: null, p90: null };
  return {
    count: scores.length,
    min: Math.min.apply(null, scores),
    max: Math.max.apply(null, scores),
    median: _percentile(scores, 50),
    p90: _percentile(scores, 90)
  };
}

function configure({ size = DEFAULT_BUFFER_SIZE, enabled = true } = {}) {
  _state.size = Math.max(50, Number(size) || DEFAULT_BUFFER_SIZE);
  _state.enabled = !!enabled;
}

function clearBuffer() {
  _state.buffer.length = 0;
}

/**
 * Recebe a saída completa do gateway (`compose(user)`) e arquiva o trace.
 *
 * @param {object} input
 * @param {object} input.gatewayResult  resultado de `gateway.compose(user)`
 * @param {object} input.user           req.user
 * @returns {object|null} trace arquivado (ou null se desligado)
 */
function record({ gatewayResult, user }) {
  if (!_state.enabled || !gatewayResult || !gatewayResult.primary) return null;
  const p = gatewayResult.primary;
  const expl = p.explainability || {};
  const trace = {
    trace_id: gatewayResult.trace_id || p.trace_id || null,
    timestamp: _now(),
    latency_ms: gatewayResult.latency_ms ?? null,
    engine: gatewayResult.engine,
    user: {
      id: user?.id ?? null,
      company_id: user?.company_id ?? null,
      role: user?.role ?? null,
      area: p.identity?.area || null,
      function_type: p.identity?.function_type || null,
      hierarchy_level: user?.hierarchy_level ?? null
    },
    directive: gatewayResult.directive || null,
    identity: {
      primary_axis: p.identity?.primary_axis || null,
      axes_priority: p.identity?.axes_priority || [],
      unlocked_axes: p.identity?.unlocked_axes || [],
      capabilities: p.identity?.capabilities || [],
      sources: p.identity?.sources || null
    },
    widgets: {
      selected: (p.modulos || []).map((m) => ({
        id: m.id,
        score: typeof m.score === 'number' ? m.score : null,
        contexto: m.contexto || null
      })),
      denied: (expl.widgets_denied || []).map((d) => ({
        id: d.id,
        reason: d.reason,
        capabilities_missing: d.capabilities_missing || []
      }))
    },
    score_distribution: _summarizeScores(expl.widgets_selected || []),
    diff_summary: gatewayResult.diff
      ? {
          jaccard: gatewayResult.diff.jaccard_widgets,
          top3_changes: gatewayResult.diff.top3_changes,
          critical_divergence: gatewayResult.diff.critical_divergence
        }
      : null,
    rationale_human: expl.rationale_human || null
  };

  _state.buffer.push(trace);
  while (_state.buffer.length > _state.size) _state.buffer.shift();

  return trace;
}

function getRecent({ limit = 50, area = null, functionType = null, traceId = null } = {}) {
  let out = _state.buffer.slice();
  if (traceId) out = out.filter((t) => t.trace_id === traceId);
  if (area) out = out.filter((t) => t.user?.area === area);
  if (functionType) out = out.filter((t) => t.user?.function_type === functionType);
  return out.slice(-Math.max(1, Math.min(_state.size, Number(limit) || 50)));
}

function statsByEngine() {
  const counts = { A: 0, B: 0, A_with_B_shadow: 0, B_with_A_shadow: 0, other: 0 };
  for (const t of _state.buffer) {
    const k = t.engine && counts[t.engine] !== undefined ? t.engine : 'other';
    counts[k] += 1;
  }
  return counts;
}

function statsByArea() {
  const counts = {};
  for (const t of _state.buffer) {
    const k = t.user?.area || 'unknown';
    counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
}

module.exports = {
  configure,
  clearBuffer,
  record,
  getRecent,
  statsByEngine,
  statsByArea,
  // internal
  _state
};
