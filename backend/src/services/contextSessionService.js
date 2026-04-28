'use strict';

/**
 * Context Engine leve: estado multi-turno em memória por (empresa, utilizador).
 * Não grava corpo de pedidos, respostas de modelo nem blocos de texto longos — só metadados (intenção, chaves, contagens).
 */

const TTL_MS = 30 * 60 * 1000;
const MAX_INTENTS = 5;
const MAX_ENTITY_KEYS = 20;
const MAX_STR_LEN = 200;

/** @type {Map<string, { last_intents: string[], last_entities: object, last_contextual_data: object, last_interaction_at: number }>} */
const store = new Map();

let pruneTimer = null;

/**
 * @param {object|null|undefined} user
 * @returns {string|null}
 */
function sessionKey(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }
  const cid = user.company_id != null ? String(user.company_id).trim() : '';
  const uid = user.id != null ? String(user.id).trim() : '';
  if (!cid || !uid) {
    return null;
  }
  return `${cid}::${uid}`;
}

/**
 * @param {object} ent
 * @returns {object}
 */
function sanitizeEntitiesForStorage(ent) {
  if (!ent || typeof ent !== 'object' || Array.isArray(ent)) {
    return {};
  }
  const out = {};
  let n = 0;
  for (const [k, raw] of Object.entries(ent)) {
    if (n >= MAX_ENTITY_KEYS) {
      break;
    }
    const key = String(k).slice(0, 64);
    if (raw == null) {
      out[key] = null;
      n += 1;
      continue;
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      out[key] = raw;
      n += 1;
      continue;
    }
    if (typeof raw === 'boolean') {
      out[key] = raw;
      n += 1;
      continue;
    }
    if (typeof raw === 'string') {
      out[key] = raw.slice(0, MAX_STR_LEN);
      n += 1;
      continue;
    }
    if (Array.isArray(raw) && raw.every((x) => typeof x === 'string')) {
      out[key] = raw.slice(0, 8).map((s) => String(s).slice(0, 64));
      n += 1;
    }
  }
  return out;
}

/**
 * Só resumo: chaves, contagens, sinais — nunca conteúdo de conversa nem payloads completos.
 * @param {object|null|undefined} cd
 * @returns {object}
 */
function summarizeContextualDataMeta(cd) {
  if (!cd || typeof cd !== 'object' || Array.isArray(cd)) {
    return {};
  }
  const keys = Object.keys(cd)
    .filter(
      (k) =>
        k !== 'users' && k !== 'events' && k !== 'machines' && k !== 'recent_events' && k !== 'learning_summary'
    )
    .slice(0, 20);
  const out = { _data_keys: keys };
  if (Array.isArray(cd.events)) {
    out.events_n = Math.min(999, cd.events.length);
  }
  if (Array.isArray(cd.machines)) {
    out.machines_n = Math.min(999, cd.machines.length);
  }
  if (Array.isArray(cd.recent_events)) {
    out.recent_events_n = Math.min(999, cd.recent_events.length);
  }
  if (cd.correlation) {
    out.has_correlation = true;
  }
  if (Array.isArray(cd.prioritized_actions)) {
    out.prioritized_n = Math.min(99, cd.prioritized_actions.length);
  }
  if (Array.isArray(cd.correlation_insights)) {
    out.correlation_insights_n = Math.min(99, cd.correlation_insights.length);
  }
  if (cd.machine && typeof cd.machine === 'object' && (cd.machine.id != null || cd.machine.name)) {
    out.has_machine_context = true;
  }
  if (cd.product && typeof cd.product === 'object' && (cd.product.id != null || cd.product.name)) {
    out.has_product_context = true;
  }
  if (cd.detected_intent) {
    out.detected_intent = String(cd.detected_intent).slice(0, 64);
  }
  if (Array.isArray(cd.detected_intents)) {
    out.detected_intents_n = Math.min(9, cd.detected_intents.length);
  }
  return out;
}

/**
 * @param {string[]} prev
 * @param {string[]} nextIntents
 * @returns {string[]}
 */
function rollIntents(prev, nextIntents) {
  const list = Array.isArray(prev) ? prev.slice() : [];
  for (const s of nextIntents || []) {
    if (s == null) {
      continue;
    }
    const t = String(s).trim().slice(0, 64);
    if (t) {
      list.push(t);
    }
  }
  while (list.length > MAX_INTENTS) {
    list.shift();
  }
  return list;
}

/**
 * @returns {void}
 */
function schedulePrune() {
  if (pruneTimer) {
    return;
  }
  pruneTimer = setInterval(() => {
    pruneExpiredSessions();
  }, 5 * 60 * 1000);
  if (typeof pruneTimer.unref === 'function') {
    pruneTimer.unref();
  }
}

/**
 * @returns {void}
 */
function pruneExpiredSessions() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (!v || typeof v.last_interaction_at !== 'number' || now - v.last_interaction_at > TTL_MS) {
      store.delete(k);
    }
  }
}

/**
 * @param {object|null|undefined} user
 * @returns {{ last_intents: string[], last_entities: object, last_contextual_data: object, last_interaction_at: number }|null}
 */
function getSessionContext(user) {
  const k = sessionKey(user);
  if (!k) {
    return null;
  }
  schedulePrune();
  const row = store.get(k);
  if (!row) {
    return {
      last_intents: [],
      last_entities: {},
      last_contextual_data: {},
      last_interaction_at: 0
    };
  }
  if (Date.now() - row.last_interaction_at > TTL_MS) {
    store.delete(k);
    return {
      last_intents: [],
      last_entities: {},
      last_contextual_data: {},
      last_interaction_at: 0
    };
  }
  return {
    last_intents: Array.isArray(row.last_intents) ? row.last_intents.slice() : [],
    last_entities: { ...(row.last_entities || {}) },
    last_contextual_data: { ...(row.last_contextual_data || {}) },
    last_interaction_at: row.last_interaction_at
  };
}

/**
 * @param {object|null|undefined} user
 * @param {{ intents?: string[], entities?: object, contextual_data?: object }} patch
 * @returns {void}
 */
function updateSessionContext(user, patch) {
  const k = sessionKey(user);
  if (!k) {
    return;
  }
  schedulePrune();
  const p = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {};
  const intentsIn = Array.isArray(p.intents) ? p.intents : [];
  const cur = store.get(k);
  const prevIntents = cur && Array.isArray(cur.last_intents) ? cur.last_intents : [];
  const next = {
    last_intents: rollIntents(prevIntents, intentsIn),
    last_entities: sanitizeEntitiesForStorage(p.entities),
    last_contextual_data: summarizeContextualDataMeta(p.contextual_data),
    last_interaction_at: Date.now()
  };
  store.set(k, next);
  pruneExpiredSessions();
}

/**
 * @param {object|null|undefined} user
 * @returns {void}
 */
function clearSessionContext(user) {
  const k = sessionKey(user);
  if (k) {
    store.delete(k);
  }
}

module.exports = {
  getSessionContext,
  updateSessionContext,
  clearSessionContext,
  TTL_MS,
  summarizeContextualDataMeta
};
