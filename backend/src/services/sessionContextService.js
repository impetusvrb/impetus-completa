'use strict';

/**
 * Contexto de sessão por (empresa, utilizador): cache em memória + persistência complementar em PostgreSQL.
 * Não armazena mensagens completas — apenas last_intents, last_entities, contextual_meta (metadados).
 */

const { isValidUUID } = require('../utils/security');
const sessionContextRepository = require('../repositories/sessionContextRepository');

/** @type {Map<string, {
 *   last_intents: string[],
 *   last_entities: object,
 *   contextual_meta: object,
 *   updated_at?: string
 * }>} */
const hotCache = new Map();

const FORBIDDEN_META_KEYS = new Set([
  'message',
  'text',
  'content',
  'body',
  'prompt',
  'raw',
  'user_message',
  'last_message',
  'chat_history',
  'input_text',
  'output_text'
]);

/**
 * @param {string} companyId
 * @param {string} userId
 * @returns {string}
 */
function cacheKey(companyId, userId) {
  const c = companyId != null ? String(companyId).trim() : '';
  const u = userId != null ? String(userId).trim() : '';
  return `${c}::${u}`;
}

/**
 * Remove chaves de texto longo rejeitadas; mantém só metadados estruturais.
 * @param {object} obj
 * @param {number} depth
 * @returns {object}
 */
function stripSensitiveLeaves(obj, depth = 0) {
  if (depth > 4 || !obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return !Array.isArray(obj) && obj && typeof obj === 'object' ? {} : obj;
  }
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const low = k.toLowerCase();
    if (FORBIDDEN_META_KEYS.has(low)) {
      continue;
    }
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = stripSensitiveLeaves(v, depth + 1);
    } else if (Array.isArray(v)) {
      out[k] = v
        .slice(0, 32)
        .map((x) => (x != null && typeof x === 'object' ? stripSensitiveLeaves(x, depth + 1) : x));
    } else if (typeof v === 'string') {
      out[k] = v.length > 500 ? v.slice(0, 500) : v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * @param {object|undefined} payload
 * @returns {{ last_intents: string[], last_entities: object, contextual_meta: object }}
 */
function normalizePayload(payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  const rawIntents = Array.isArray(p.last_intents) ? p.last_intents : [];
  const last_intents = rawIntents
    .map((x) => String(x).trim().slice(0, 128))
    .filter((x) => x.length)
    .slice(0, 32);

  const le = p.last_entities && typeof p.last_entities === 'object' && !Array.isArray(p.last_entities)
    ? stripSensitiveLeaves(p.last_entities)
    : {};
  const cm =
    p.contextual_meta && typeof p.contextual_meta === 'object' && !Array.isArray(p.contextual_meta)
      ? stripSensitiveLeaves(p.contextual_meta)
      : {};
  return { last_intents, last_entities: le, contextual_meta: cm };
}

/**
 * @param {object} entry
 * @returns {boolean}
 */
function isEntryVisuallyEmpty(entry) {
  if (!entry) {
    return true;
  }
  const hasIntents = Array.isArray(entry.last_intents) && entry.last_intents.length > 0;
  const he = entry.last_entities && typeof entry.last_entities === 'object';
  const hasEnt = he && Object.keys(entry.last_entities).length > 0;
  const hm = entry.contextual_meta && typeof entry.contextual_meta === 'object';
  const hasMeta = hm && Object.keys(entry.contextual_meta).length > 0;
  return !hasIntents && !hasEnt && !hasMeta;
}

/**
 * @param {string} companyId
 * @param {string} userId
 * @param {object} [payload]
 */
function schedulePersistSessionContext(companyId, userId, payload) {
  const n = normalizePayload(payload);
  setImmediate(() => {
    Promise.resolve(sessionContextRepository.upsertSessionContext(companyId, userId, n)).catch((err) => {
      console.warn('[sessionContextService][upsert_session_context]', err?.message ?? err);
    });
  });
}

/**
 * @param {string} companyId
 * @param {string} userId
 * @param {object} [payload]
 * @returns {{ ok: boolean }}
 */
function updateSessionContext(companyId, userId, payload) {
  const cid = companyId != null ? String(companyId).trim() : '';
  const uid = userId != null ? String(userId).trim() : '';
  if (!cid || !uid || !isValidUUID(cid) || !isValidUUID(uid)) {
    return { ok: false };
  }
  const n = normalizePayload(payload);
  const k = cacheKey(cid, uid);
  const prev = hotCache.get(k) || { last_intents: [], last_entities: {}, contextual_meta: {} };
  const mergedIntents = (() => {
    const a = Array.isArray(prev.last_intents) ? prev.last_intents : [];
    const b = n.last_intents.length ? n.last_intents : [];
    if (!b.length) {
      return a.slice(-32);
    }
    const seen = new Set();
    const out = [];
    for (const x of [...a, ...b].map((t) => String(t).trim()).filter(Boolean)) {
      if (seen.has(x)) {
        continue;
      }
      seen.add(x);
      out.push(x);
    }
    return out.slice(-32);
  })();
  const merged = {
    last_intents: mergedIntents,
    last_entities:
      Object.keys(n.last_entities).length > 0 ? { ...prev.last_entities, ...n.last_entities } : prev.last_entities,
    contextual_meta:
      Object.keys(n.contextual_meta).length > 0
        ? { ...prev.contextual_meta, ...n.contextual_meta }
        : prev.contextual_meta,
    updated_at: new Date().toISOString()
  };
  hotCache.set(k, merged);
  schedulePersistSessionContext(cid, uid, merged);
  return { ok: true };
}

/**
 * @param {string} companyId
 * @param {string} userId
 * @returns {Promise<{
 *   last_intents: string[],
 *   last_entities: object,
 *   contextual_meta: object,
 *   updated_at: string|null,
 *   source: 'memory'|'database'|'empty'
 * }>}
 */
async function getSessionContext(companyId, userId) {
  const cid = companyId != null ? String(companyId).trim() : '';
  const uid = userId != null ? String(userId).trim() : '';
  if (!cid || !uid || !isValidUUID(cid) || !isValidUUID(uid)) {
    return {
      last_intents: [],
      last_entities: {},
      contextual_meta: {},
      updated_at: null,
      source: 'empty'
    };
  }
  const k = cacheKey(cid, uid);
  const mem = hotCache.get(k);
  if (mem && !isEntryVisuallyEmpty(mem)) {
    return {
      last_intents: Array.isArray(mem.last_intents) ? mem.last_intents : [],
      last_entities: mem.last_entities && typeof mem.last_entities === 'object' ? mem.last_entities : {},
      contextual_meta:
        mem.contextual_meta && typeof mem.contextual_meta === 'object' ? mem.contextual_meta : {},
      updated_at: mem.updated_at != null ? String(mem.updated_at) : null,
      source: 'memory'
    };
  }

  const row = await sessionContextRepository.getSessionContext(cid, uid);
  if (row && !isEntryVisuallyEmpty(row)) {
    const hydrated = {
      last_intents: row.last_intents,
      last_entities: row.last_entities,
      contextual_meta: row.contextual_meta,
      updated_at: row.updated_at
    };
    hotCache.set(k, hydrated);
    return {
      last_intents: Array.isArray(hydrated.last_intents) ? hydrated.last_intents : [],
      last_entities: hydrated.last_entities,
      contextual_meta: hydrated.contextual_meta,
      updated_at: hydrated.updated_at,
      source: 'database'
    };
  }

  return {
    last_intents: [],
    last_entities: {},
    contextual_meta: {},
    updated_at: null,
    source: 'empty'
  };
}

const RISK_ORDER = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, OK: 0 };

/**
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
function maxRiskBand(a, b) {
  const ra = RISK_ORDER[String(a).toUpperCase()] != null ? RISK_ORDER[String(a).toUpperCase()] : -1;
  const rb = RISK_ORDER[String(b).toUpperCase()] != null ? RISK_ORDER[String(b).toUpperCase()] : -1;
  return ra >= rb ? a : b;
}

/**
 * Resumo agregado ao nível da empresa (sem identificação de pessoas).
 * @param {string} companyId
 * @returns {Promise<{
 *   top_intents: Array<{ intent: string, count: number }>,
 *   machines_with_elevated_risk: Array<{ machine_id: string, risk_band: string }>,
 *   context_rows_sampled: number,
 *   distinct_sessions_in_sample: number
 * }|null>}
 */
async function getCompanyContextSummary(companyId) {
  const cid = companyId != null ? String(companyId).trim() : '';
  if (!cid || !isValidUUID(cid)) {
    return null;
  }
  try {
    const rows = await sessionContextRepository.getRecentCompanyContexts(cid, 50);
    if (!rows.length) {
      return {
        top_intents: [],
        machines_with_elevated_risk: [],
        context_rows_sampled: 0,
        distinct_sessions_in_sample: 0
      };
    }

    const intentFreq = new Map();
    const machineToBand = new Map();
    const userSet = new Set();

    for (const row of rows) {
      if (row.user_id) {
        userSet.add(String(row.user_id));
      }
      const list = Array.isArray(row.last_intents) ? row.last_intents : [];
      for (const it of list) {
        const key = String(it).trim().slice(0, 200);
        if (!key) {
          continue;
        }
        intentFreq.set(key, (intentFreq.get(key) || 0) + 1);
      }
      const meta = row.contextual_meta && typeof row.contextual_meta === 'object' ? row.contextual_meta : {};
      const fromMetaArrays = [
        ...(Array.isArray(meta.machine_ids_focus) ? meta.machine_ids_focus : []),
        ...(Array.isArray(meta.machines_risk) ? meta.machines_risk : []),
        ...(Array.isArray(meta.elevated_risk_machines) ? meta.elevated_risk_machines : [])
      ];
      for (const mid of fromMetaArrays) {
        if (mid == null) {
          continue;
        }
        const id = String(mid).trim();
        if (id) {
          machineToBand.set(id, maxRiskBand(machineToBand.get(id) || 'LOW', meta.risk_band || 'HIGH'));
        }
      }
      if (Array.isArray(meta.predictions_risk)) {
        for (const pr of meta.predictions_risk) {
          if (pr && pr.machine_id != null) {
            const id = String(pr.machine_id).trim();
            const band = pr.risk_level != null ? String(pr.risk_level) : 'MEDIUM';
            if (id) {
              machineToBand.set(id, maxRiskBand(machineToBand.get(id) || 'OK', band));
            }
          }
        }
      }
    }

    const top_intents = [...intentFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([intent, count]) => ({ intent, count }));

    const machines_with_elevated_risk = [];
    for (const [mid, band] of machineToBand) {
      const b = String(band).toUpperCase();
      if (b === 'CRITICAL' || b === 'HIGH' || b === 'MEDIUM' || b === 'ATTENTION') {
        machines_with_elevated_risk.push({ machine_id: mid, risk_band: band });
      }
    }
    machines_with_elevated_risk.sort((a, b) => String(a.machine_id).localeCompare(String(b.machine_id)));
    if (machines_with_elevated_risk.length > 40) {
      machines_with_elevated_risk.length = 40;
    }

    return {
      top_intents,
      machines_with_elevated_risk,
      context_rows_sampled: rows.length,
      distinct_sessions_in_sample: userSet.size
    };
  } catch (e) {
    console.warn('[SESSION_CONTEXT] getCompanyContextSummary', e && e.message ? String(e.message) : e);
    return null;
  }
}

/**
 * Limpa cache em memória para testes ou reload seletivo (não remove PostgreSQL).
 * @param {string} [companyId]
 */
function clearSessionContextMemory(companyId) {
  if (companyId == null || String(companyId).trim() === '') {
    hotCache.clear();
    return;
  }
  const prefix = `${String(companyId).trim()}::`;
  for (const k of hotCache.keys()) {
    if (k.startsWith(prefix)) {
      hotCache.delete(k);
    }
  }
}

module.exports = {
  updateSessionContext,
  getSessionContext,
  getCompanyContextSummary,
  clearSessionContextMemory
};
