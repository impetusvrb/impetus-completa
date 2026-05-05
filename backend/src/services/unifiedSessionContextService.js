'use strict';

/**
 * Contexto de sessão unificado: único ponto de entrada de leitura/escrita para o código de negócio.
 * Internamente combina memória volátil (TTL) + cache/BD (PostgreSQL).
 *
 * Utilizar sempre `getUnifiedSessionContext` / `updateUnifiedSessionContext` fora deste módulo.
 */

const { isValidUUID } = require('../utils/security');
const contextSessionService = require('./contextSessionService');
const sessionContextService = require('./sessionContextService');

const EMPTY_DB = {
  last_intents: [],
  last_entities: {},
  contextual_meta: {},
  updated_at: null,
  source: 'empty'
};

/**
 * Preserva ordem temporal: BD primeiro, memória depois; intenções repetidas mantêm a ocorrência mais recente.
 * @param {string[]} dbList
 * @param {string[]} memList
 * @returns {string[]}
 */
function mergeIntentLists(dbList, memList) {
  const merged = [
    ...(Array.isArray(dbList) ? dbList : []),
    ...(Array.isArray(memList) ? memList : [])
  ];
  const lastIdx = new Map();
  merged.forEach((x, i) => {
    const t = String(x || '')
      .trim()
      .slice(0, 128);
    if (t) {
      lastIdx.set(t, i);
    }
  });
  const out = merged.filter((x, i) => {
    const t = String(x || '')
      .trim()
      .slice(0, 128);
    return t && lastIdx.get(t) === i;
  });
  return out.slice(-32);
}

/**
 * @param {object} dbEnt
 * @param {object} memEnt
 * @returns {object}
 */
function mergeEntities(dbEnt, memEnt) {
  const d = dbEnt && typeof dbEnt === 'object' && !Array.isArray(dbEnt) ? dbEnt : {};
  const m = memEnt && typeof memEnt === 'object' && !Array.isArray(memEnt) ? memEnt : {};
  return { ...d, ...m };
}

/**
 * @param {object} dbMeta
 * @param {object} memMeta
 * @returns {object}
 */
function mergeContextualMeta(dbMeta, memMeta) {
  const d = dbMeta && typeof dbMeta === 'object' && !Array.isArray(dbMeta) ? dbMeta : {};
  const m = memMeta && typeof memMeta === 'object' && !Array.isArray(memMeta) ? memMeta : {};
  return { ...d, ...m };
}

/**
 * @param {object|null} memoryRow — saída de contextSessionService.getSessionContext
 * @param {object|null} dbRow — saída de sessionContextService.getSessionContext
 * @returns {object}
 */
function mergeContexts(memoryRow, dbRow) {
  const mem =
    memoryRow && typeof memoryRow === 'object' && !Array.isArray(memoryRow) ? memoryRow : null;
  const db = dbRow && typeof dbRow === 'object' && !Array.isArray(dbRow) ? dbRow : null;

  const memIntents = mem && Array.isArray(mem.last_intents) ? mem.last_intents : [];
  const dbIntents = db && Array.isArray(db.last_intents) ? db.last_intents : [];
  const last_intents = mergeIntentLists(dbIntents, memIntents);

  const dbEnt = db && db.last_entities && typeof db.last_entities === 'object' ? db.last_entities : {};
  const memEnt = mem && mem.last_entities && typeof mem.last_entities === 'object' ? mem.last_entities : {};
  const last_entities = mergeEntities(dbEnt, memEnt);

  const dbMeta = db && db.contextual_meta && typeof db.contextual_meta === 'object' ? db.contextual_meta : {};
  const memMeta =
    mem && mem.last_contextual_data && typeof mem.last_contextual_data === 'object'
      ? mem.last_contextual_data
      : {};
  const contextual_meta = mergeContextualMeta(dbMeta, memMeta);

  const last_interaction_at =
    mem && typeof mem.last_interaction_at === 'number' ? mem.last_interaction_at : null;

  return {
    last_intents,
    last_entities,
    last_contextual_data: { ...memMeta },
    contextual_meta,
    last_interaction_at,
    updated_at: db && db.updated_at != null ? db.updated_at : null,
    _session_sources: {
      db: db && db.source != null ? db.source : 'empty',
      memory_ttl_ms: contextSessionService.TTL_MS
    }
  };
}

/**
 * @param {object|null|undefined} user
 * @returns {Promise<object|null>}
 */
async function getUnifiedSessionContext(user) {
  if (!user || typeof user !== 'object' || !user.company_id || !user.id) {
    return null;
  }
  const memoryContext = contextSessionService.getSessionContext(user);
  let dbContext = EMPTY_DB;
  try {
    dbContext = await sessionContextService.getSessionContext(
      String(user.company_id).trim(),
      String(user.id).trim()
    );
  } catch (e) {
    console.warn(
      '[UNIFIED_SESSION_CONTEXT]',
      e && e.message ? String(e.message) : e
    );
    dbContext = { ...EMPTY_DB };
  }
  return mergeContexts(memoryContext, dbContext);
}

/**
 * Grava o mesmo patch na memória TTL e na camada persistida (hotCache + upsert assíncrono à BD).
 * Contrato alinhado a {@link contextSessionService.updateSessionContext}.
 *
 * @param {object|null|undefined} user
 * @param {{ intents?: string[], entities?: object, contextual_data?: object }} patch
 * @returns {void}
 */
function updateUnifiedSessionContext(user, patch) {
  if (!user || typeof user !== 'object' || !user.company_id || !user.id) {
    return;
  }
  contextSessionService.updateSessionContext(user, patch);
  const cid = String(user.company_id).trim();
  const uid = String(user.id).trim();
  if (!isValidUUID(cid) || !isValidUUID(uid)) {
    return;
  }
  const p = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {};
  const rawIntents = Array.isArray(p.intents) ? p.intents : [];
  const last_intents = rawIntents
    .map((x) => (x != null ? String(x).trim() : ''))
    .filter(Boolean)
    .slice(0, 32);
  const last_entities =
    p.entities && typeof p.entities === 'object' && !Array.isArray(p.entities) ? p.entities : {};
  const contextual_meta = contextSessionService.summarizeContextualDataMeta(p.contextual_data);
  sessionContextService.updateSessionContext(cid, uid, {
    last_intents,
    last_entities,
    contextual_meta
  });
}

const _fingerprintWindows = new Map();
const MAX_FINGERPRINTS = 8;
const FINGERPRINT_TTL_MS = 30 * 60 * 1000; // 30 min

function addResponseFingerprint(user, hash) {
  if (!user || !user.id || !hash) return;
  const key = `${user.company_id}:${user.id}`;
  let entry = _fingerprintWindows.get(key);
  if (!entry || Date.now() - entry.ts > FINGERPRINT_TTL_MS) {
    entry = { hashes: [], ts: Date.now() };
  }
  entry.hashes.push(String(hash));
  if (entry.hashes.length > MAX_FINGERPRINTS) {
    entry.hashes = entry.hashes.slice(-MAX_FINGERPRINTS);
  }
  entry.ts = Date.now();
  _fingerprintWindows.set(key, entry);
}

function getResponseFingerprints(user) {
  if (!user || !user.id) return [];
  const key = `${user.company_id}:${user.id}`;
  const entry = _fingerprintWindows.get(key);
  if (!entry || Date.now() - entry.ts > FINGERPRINT_TTL_MS) return [];
  return entry.hashes;
}

module.exports = {
  getUnifiedSessionContext,
  updateUnifiedSessionContext,
  mergeContexts,
  addResponseFingerprint,
  getResponseFingerprints
};
