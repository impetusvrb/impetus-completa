'use strict';

/**
 * ContextualExperienceTelemetry
 *
 * Recolhe métricas da experiência real entregue pelo `LiveDashboardUnified
 * Panel` quando o Motor B está envolvido (shadow ou promoted).
 *
 * Buffer em memória (ring buffer); compatível com adapter externo via
 * `setStorageAdapter`. Sem PII — apenas user_id, function_type, area,
 * widget ids, scores, latências.
 *
 * Métricas-chave:
 *   - resolutions          (snapshots produzidos)
 *   - mode_breakdown       (shadow/enrich/replace/legacy)
 *   - validator_failures   (rate)
 *   - fallback_rate        (Motor A usado depois de B ter falhado)
 *   - widget_overlap_rate  (∩ B vs legacy / ∪ widgets)
 *   - latency_ms           (p50/p95)
 *   - trust_score          (média móvel da confiança do validator)
 */

const _LIMIT_DEFAULT = 1000;
let _capacity = _LIMIT_DEFAULT;
let _buffer = [];
let _adapter = null;

function setCapacity(n) {
  const v = Math.max(50, Math.min(20000, Number(n) || _LIMIT_DEFAULT));
  _capacity = v;
  if (_buffer.length > _capacity) _buffer = _buffer.slice(_buffer.length - _capacity);
}
function setStorageAdapter(adapter) {
  if (adapter && typeof adapter.append === 'function') _adapter = adapter; else _adapter = null;
}
function reset() { _buffer = []; }
function size() { return _buffer.length; }

function _push(event) {
  _buffer.push(event);
  if (_buffer.length > _capacity) _buffer.shift();
  if (_adapter && typeof _adapter.append === 'function') {
    Promise.resolve().then(() => _adapter.append(event)).catch((err) => {
      if (typeof console !== 'undefined') {
        console.warn('[CONTEXTUAL_EXPERIENCE_ADAPTER_ERROR]', err && err.message ? err.message : err);
      }
    });
  }
  return event;
}

/**
 * Regista uma resolução (uma chamada de `enhanceLiveState`).
 *
 * @param {object} ev
 * @param {string} ev.user_id
 * @param {string} ev.company_id
 * @param {string} ev.mode             'shadow' | 'enrich' | 'replace' | 'legacy'
 * @param {string} ev.engine           'A' | 'B' | 'A_with_B_shadow'
 * @param {string} [ev.function_type]
 * @param {string} [ev.primary_axis]
 * @param {string[]} [ev.legacy_widget_ids]
 * @param {string[]} [ev.contextual_widget_ids]
 * @param {object} [ev.validator]      veredicto do experienceValidator
 * @param {number} [ev.latency_legacy_ms]
 * @param {number} [ev.latency_contextual_ms]
 * @param {boolean} [ev.fallback_triggered]
 * @param {string} [ev.fallback_reason]
 */
function record(ev) {
  if (!ev) return null;
  const evt = {
    ts: Date.now(),
    user_id: ev.user_id || null,
    company_id: ev.company_id || null,
    mode: ev.mode || 'legacy',
    engine: ev.engine || 'A',
    function_type: ev.function_type || null,
    primary_axis: ev.primary_axis || null,
    legacy_widget_ids: Array.isArray(ev.legacy_widget_ids) ? [...ev.legacy_widget_ids] : [],
    contextual_widget_ids: Array.isArray(ev.contextual_widget_ids) ? [...ev.contextual_widget_ids] : [],
    validator_ok: ev.validator?.ok ?? null,
    validator_score: Number.isFinite(ev.validator?.score) ? ev.validator.score : null,
    validator_issues_count: Array.isArray(ev.validator?.issues) ? ev.validator.issues.length : 0,
    latency_legacy_ms: Number.isFinite(ev.latency_legacy_ms) ? ev.latency_legacy_ms : null,
    latency_contextual_ms: Number.isFinite(ev.latency_contextual_ms) ? ev.latency_contextual_ms : null,
    fallback_triggered: !!ev.fallback_triggered,
    fallback_reason: ev.fallback_reason || null
  };
  return _push(evt);
}

function _percentile(arr, p) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function _overlap(a, b) {
  if (!a?.length || !b?.length) return 0;
  const sa = new Set(a), sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * Sumário agregado.
 *
 * @param {object} [filter] { user_id, function_type, since, until }
 */
function summary(filter = {}) {
  const since = filter.since ? new Date(filter.since).getTime() : 0;
  const until = filter.until ? new Date(filter.until).getTime() : Number.POSITIVE_INFINITY;
  const rows = _buffer.filter((e) =>
    (!filter.user_id || e.user_id === filter.user_id) &&
    (!filter.function_type || e.function_type === filter.function_type) &&
    e.ts >= since && e.ts <= until
  );

  const total = rows.length;
  if (total === 0) {
    return { total: 0, mode_breakdown: {}, fallback_rate: 0, validator_failure_rate: 0,
             trust_score: null, widget_overlap_rate: null, latency: { p50_legacy: null, p95_legacy: null, p50_contextual: null, p95_contextual: null } };
  }

  const modeBreakdown = {};
  let fallbacks = 0;
  let validatorFailures = 0;
  const trustScores = [];
  const overlaps = [];
  const lLegacy = [];
  const lContextual = [];
  for (const e of rows) {
    modeBreakdown[e.mode] = (modeBreakdown[e.mode] || 0) + 1;
    if (e.fallback_triggered) fallbacks += 1;
    if (e.validator_ok === false) validatorFailures += 1;
    if (Number.isFinite(e.validator_score)) trustScores.push(e.validator_score);
    if (e.legacy_widget_ids?.length || e.contextual_widget_ids?.length) {
      overlaps.push(_overlap(e.legacy_widget_ids, e.contextual_widget_ids));
    }
    if (Number.isFinite(e.latency_legacy_ms)) lLegacy.push(e.latency_legacy_ms);
    if (Number.isFinite(e.latency_contextual_ms)) lContextual.push(e.latency_contextual_ms);
  }
  const trust = trustScores.length ? trustScores.reduce((a, b) => a + b, 0) / trustScores.length : null;
  const overlapAvg = overlaps.length ? overlaps.reduce((a, b) => a + b, 0) / overlaps.length : null;

  return {
    total,
    mode_breakdown: modeBreakdown,
    fallback_rate: fallbacks / total,
    validator_failure_rate: validatorFailures / total,
    trust_score: trust !== null ? Math.round(trust * 10) / 10 : null,
    widget_overlap_rate: overlapAvg !== null ? Math.round(overlapAvg * 100) / 100 : null,
    latency: {
      p50_legacy:     _percentile(lLegacy, 50),
      p95_legacy:     _percentile(lLegacy, 95),
      p50_contextual: _percentile(lContextual, 50),
      p95_contextual: _percentile(lContextual, 95)
    }
  };
}

function getRecent(filter = {}, limit = 100) {
  const out = [];
  for (let i = _buffer.length - 1; i >= 0 && out.length < limit; i -= 1) {
    const e = _buffer[i];
    if (filter.user_id && e.user_id !== filter.user_id) continue;
    if (filter.mode && e.mode !== filter.mode) continue;
    out.push(e);
  }
  return out;
}

module.exports = {
  record,
  summary,
  getRecent,
  setCapacity,
  setStorageAdapter,
  reset,
  size
};
