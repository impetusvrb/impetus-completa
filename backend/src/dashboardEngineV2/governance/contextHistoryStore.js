'use strict';

/**
 * ContextHistoryStore
 *
 * Registo temporal de mudanças contextuais. Buffer em memória (ring) por defeito,
 * com adaptador opcional para PostgreSQL via `setStorageAdapter`.
 *
 * Eventos canónicos:
 *   - area_change             { user_id, before, after }
 *   - capability_change       { user_id, added: [], removed: [] }
 *   - function_change         { user_id, before, after }
 *   - hierarchy_change        { user_id, before, after }
 *   - integrity_score_change  { scope, before, after, delta }
 *   - policy_change           { policy_id, before, after }
 *   - risk_emitted            { risk_type, severity, user_id, area }
 *   - recommendation_emitted  { type, severity, target }
 *
 * Cada evento gravado tem:
 *   { id, occurred_at, recorded_at, kind, scope, payload, source }
 *
 * Esta camada é READ + APPEND-ONLY. Não permite remoção/edição (auditoria).
 */

const crypto = require('crypto');

const DEFAULT_CAPACITY = 5000;

let _capacity = DEFAULT_CAPACITY;
let _buffer = [];
let _seq = 0;
let _adapter = null; // { append(event) → Promise<void>, query(filter) → Promise<events[]> }

function _id() {
  _seq += 1;
  return `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}-${_seq}`;
}

function setCapacity(n) {
  const v = Math.max(100, Math.min(100000, Number(n) || DEFAULT_CAPACITY));
  _capacity = v;
  if (_buffer.length > _capacity) _buffer = _buffer.slice(_buffer.length - _capacity);
}

function setStorageAdapter(adapter) {
  if (adapter && typeof adapter.append === 'function') _adapter = adapter;
  else _adapter = null;
}

function reset() {
  _buffer = [];
  _seq = 0;
}

function _push(event) {
  _buffer.push(event);
  if (_buffer.length > _capacity) _buffer.shift();
  if (_adapter && typeof _adapter.append === 'function') {
    Promise.resolve()
      .then(() => _adapter.append(event))
      .catch((err) => {
        if (typeof console !== 'undefined') {
          console.warn('[CONTEXT_HISTORY_ADAPTER_ERROR]', err && err.message ? err.message : err);
        }
      });
  }
  return event;
}

/**
 * Regista um evento canónico.
 *
 * @param {string} kind       ex.: 'capability_change'
 * @param {object} payload    payload específico do evento
 * @param {object} [opts]
 * @param {string} [opts.scope]   ex.: 'user:123', 'company:42', 'area:finance'
 * @param {string} [opts.source]  ex.: 'governance', 'admin_routes'
 * @param {string} [opts.occurred_at] ISO8601 — defaults to now
 */
function record(kind, payload, opts = {}) {
  if (!kind || typeof kind !== 'string') return null;
  const event = {
    id: _id(),
    occurred_at: opts.occurred_at || new Date().toISOString(),
    recorded_at: new Date().toISOString(),
    kind,
    scope: opts.scope || (payload && payload.user_id ? `user:${payload.user_id}` : 'global'),
    payload: payload || {},
    source: opts.source || 'governance'
  };
  return _push(event);
}

/**
 * Helpers convenience — wrappers tipados para os 8 eventos canónicos.
 */
function recordAreaChange({ user_id, before, after }, opts) {
  return record('area_change', { user_id, before, after }, opts);
}
function recordCapabilityChange({ user_id, added, removed }, opts) {
  return record('capability_change', {
    user_id,
    added: Array.isArray(added) ? added : [],
    removed: Array.isArray(removed) ? removed : []
  }, opts);
}
function recordFunctionChange({ user_id, before, after }, opts) {
  return record('function_change', { user_id, before, after }, opts);
}
function recordHierarchyChange({ user_id, before, after }, opts) {
  return record('hierarchy_change', { user_id, before, after }, opts);
}
function recordIntegrityScoreChange({ scope, before, after }, opts) {
  const delta = (after ?? 0) - (before ?? 0);
  return record('integrity_score_change', { scope, before, after, delta: Math.round(delta * 10) / 10 }, opts);
}
function recordPolicyChange({ policy_id, before, after }, opts) {
  return record('policy_change', { policy_id, before, after }, opts);
}
function recordRiskEmitted({ risk_type, severity, user_id, area }, opts) {
  return record('risk_emitted', { risk_type, severity, user_id, area }, opts);
}
function recordRecommendationEmitted({ type, severity, target }, opts) {
  return record('recommendation_emitted', { type, severity, target }, opts);
}

function _matches(event, filter) {
  if (!filter) return true;
  if (filter.kind && event.kind !== filter.kind) return false;
  if (filter.scope && event.scope !== filter.scope) return false;
  if (filter.user_id && event.payload?.user_id !== filter.user_id) return false;
  if (filter.since) {
    const t = new Date(filter.since).getTime();
    if (Number.isFinite(t) && new Date(event.occurred_at).getTime() < t) return false;
  }
  if (filter.until) {
    const t = new Date(filter.until).getTime();
    if (Number.isFinite(t) && new Date(event.occurred_at).getTime() > t) return false;
  }
  return true;
}

/**
 * Lista eventos do buffer (memória) com filtros opcionais.
 */
function getRecent(filter = {}, limit = 200) {
  const out = [];
  for (let i = _buffer.length - 1; i >= 0 && out.length < limit; i -= 1) {
    if (_matches(_buffer[i], filter)) out.push(_buffer[i]);
  }
  return out;
}

/**
 * Linha do tempo agregada por dia para um scope.
 */
function timeline(scope, kind = null, days = 30) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const buckets = new Map();
  for (const e of _buffer) {
    if (scope && e.scope !== scope) continue;
    if (kind && e.kind !== kind) continue;
    const t = new Date(e.occurred_at).getTime();
    if (t < cutoff) continue;
    const day = new Date(e.occurred_at).toISOString().slice(0, 10);
    if (!buckets.has(day)) buckets.set(day, []);
    buckets.get(day).push(e);
  }
  const out = [];
  for (const [day, events] of buckets.entries()) out.push({ day, count: events.length, events });
  return out.sort((a, b) => a.day.localeCompare(b.day));
}

function size() { return _buffer.length; }

async function queryFromAdapter(filter = {}) {
  if (_adapter && typeof _adapter.query === 'function') {
    return _adapter.query(filter);
  }
  return getRecent(filter, filter.limit || 200);
}

module.exports = {
  setCapacity,
  setStorageAdapter,
  reset,
  record,
  recordAreaChange,
  recordCapabilityChange,
  recordFunctionChange,
  recordHierarchyChange,
  recordIntegrityScoreChange,
  recordPolicyChange,
  recordRiskEmitted,
  recordRecommendationEmitted,
  getRecent,
  timeline,
  size,
  queryFromAdapter,
  _internals: { get buffer() { return _buffer; } }
};
