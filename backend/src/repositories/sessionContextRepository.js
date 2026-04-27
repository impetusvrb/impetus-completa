'use strict';

/**
 * Persistência de metadados de contexto de sessão (sem texto livre do utilizador).
 */

const db = require('../db');
const { isValidUUID } = require('../utils/security');

const MAX_INTENTS_STORE = 24;
const MAX_CONTEXT_ROWS = 200;

/**
 * @param {unknown} v
 * @returns {object}
 */
function safeJsonObject(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v;
  }
  return {};
}

/**
 * @param {unknown} v
 * @returns {unknown[]}
 */
function safeJsonArray(v) {
  return Array.isArray(v) ? v : [];
}

/**
 * @param {string} companyId
 * @param {string} userId
 * @param {{
 *   last_intents?: unknown[],
 *   last_entities?: object,
 *   contextual_meta?: object
 * }} payload
 * @returns {Promise<boolean>}
 */
async function upsertSessionContext(companyId, userId, payload) {
  const cid = companyId != null ? String(companyId).trim() : '';
  const uid = userId != null ? String(userId).trim() : '';
  if (!cid || !uid || !isValidUUID(cid) || !isValidUUID(uid)) {
    return false;
  }
  const p = payload && typeof payload === 'object' ? payload : {};
  const last_intents = safeJsonArray(p.last_intents)
    .slice(0, MAX_INTENTS_STORE)
    .map((x) => String(x).slice(0, 128));
  const last_entities = safeJsonObject(p.last_entities);
  const contextual_meta = safeJsonObject(p.contextual_meta);

  try {
    await db.query(
      `
      INSERT INTO session_context (company_id, user_id, last_intents, last_entities, contextual_meta, updated_at)
      VALUES ($1::uuid, $2::uuid, $3::jsonb, $4::jsonb, $5::jsonb, now())
      ON CONFLICT (company_id, user_id)
      DO UPDATE SET
        last_intents = EXCLUDED.last_intents,
        last_entities = EXCLUDED.last_entities,
        contextual_meta = EXCLUDED.contextual_meta,
        updated_at = now()
      `,
      [cid, uid, JSON.stringify(last_intents), JSON.stringify(last_entities), JSON.stringify(contextual_meta)]
    );
    return true;
  } catch (e) {
    console.warn('[SESSION_CONTEXT_REPO] upsertSessionContext', e && e.message ? String(e.message) : e);
    return false;
  }
}

/**
 * @param {string} companyId
 * @param {string} userId
 * @returns {Promise<{
 *   last_intents: unknown[],
 *   last_entities: object,
 *   contextual_meta: object,
 *   updated_at: string|null
 * }|null>}
 */
async function getSessionContext(companyId, userId) {
  const cid = companyId != null ? String(companyId).trim() : '';
  const uid = userId != null ? String(userId).trim() : '';
  if (!cid || !uid || !isValidUUID(cid) || !isValidUUID(uid)) {
    return null;
  }
  try {
    const r = await db.query(
      `SELECT last_intents, last_entities, contextual_meta, updated_at
       FROM session_context
       WHERE company_id = $1::uuid AND user_id = $2::uuid
       LIMIT 1`,
      [cid, uid]
    );
    const row = r.rows && r.rows[0];
    if (!row) {
      return null;
    }
    return {
      last_intents: safeJsonArray(row.last_intents),
      last_entities: safeJsonObject(row.last_entities),
      contextual_meta: safeJsonObject(row.contextual_meta),
      updated_at: row.updated_at != null ? new Date(row.updated_at).toISOString() : null
    };
  } catch (e) {
    if (e && e.message && String(e.message).includes('does not exist')) {
      return null;
    }
    console.warn('[SESSION_CONTEXT_REPO] getSessionContext', e && e.message ? String(e.message) : e);
    return null;
  }
}

/**
 * Linhas recentes por empresa (metadados apenas; sem nomes de utilizador).
 * @param {string} companyId
 * @param {number} [limit]
 * @returns {Promise<Array<{
 *   user_id: string,
 *   last_intents: unknown[],
 *   last_entities: object,
 *   contextual_meta: object,
 *   updated_at: string|null
 * }>>}
 */
async function getRecentCompanyContexts(companyId, limit = 10) {
  const cid = companyId != null ? String(companyId).trim() : '';
  const lim = Math.min(
    Math.max(parseInt(String(limit), 10) || 10, 1),
    MAX_CONTEXT_ROWS
  );
  if (!cid || !isValidUUID(cid)) {
    return [];
  }
  try {
    const r = await db.query(
      `
      SELECT user_id, last_intents, last_entities, contextual_meta, updated_at
      FROM session_context
      WHERE company_id = $1::uuid
      ORDER BY updated_at DESC
      LIMIT $2
      `,
      [cid, lim]
    );
    return (r.rows || []).map((row) => ({
      user_id: row.user_id != null ? String(row.user_id) : '',
      last_intents: safeJsonArray(row.last_intents),
      last_entities: safeJsonObject(row.last_entities),
      contextual_meta: safeJsonObject(row.contextual_meta),
      updated_at: row.updated_at != null ? new Date(row.updated_at).toISOString() : null
    }));
  } catch (e) {
    if (e && e.message && String(e.message).includes('does not exist')) {
      return [];
    }
    console.warn(
      '[SESSION_CONTEXT_REPO] getRecentCompanyContexts',
      e && e.message ? String(e.message) : e
    );
    return [];
  }
}

module.exports = {
  upsertSessionContext,
  getSessionContext,
  getRecentCompanyContexts
};
