'use strict';

/**
 * Auditoria do pipeline event-driven.
 *
 * Sem migração obrigatória de schema: por omissão, escreve linhas estruturadas no
 * stdout (`event=EVENT_AUDIT`) que podem ser ingeridas por Datadog/Loki/jq.
 *
 * Quando `IMPETUS_EVENT_AUDIT_DB_TABLE` está definido, tenta inserir em PostgreSQL.
 * A tabela é assumida e nunca criada por este módulo (para não interferir no
 * sistema de migrations existente). Falha em silêncio para não derrubar o pipeline.
 */

let _db = null;
function _getDb() {
  if (_db !== null) return _db;
  try {
    _db = require('../../db');
  } catch (_e) {
    _db = false;
  }
  return _db || null;
}

function _stdout(payload) {
  console.info('[EVENT_AUDIT]', JSON.stringify(payload));
}

async function _insertDb(payload) {
  const table = (process.env.IMPETUS_EVENT_AUDIT_DB_TABLE || '').trim();
  if (!table) return false;
  const db = _getDb();
  if (!db || typeof db.query !== 'function') return false;
  try {
    await db.query(
      `INSERT INTO ${table}
        (event_id, event_type, intent_pre, intent_refined, ia_chamada, route_channel, ok, summary, payload_meta, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW())`,
      [
        payload.event_id || null,
        payload.event_type || null,
        payload.intent_pre || null,
        payload.intent_refined || null,
        payload.ia_chamada || null,
        payload.route_channel || null,
        payload.ok === true,
        (payload.summary || '').slice(0, 500),
        JSON.stringify(payload.meta || {})
      ]
    );
    return true;
  } catch (err) {
    console.warn('[EVENT_AUDIT_DB_FAIL]', err && err.message);
    return false;
  }
}

/**
 * @param {{
 *   event_id?: string,
 *   event_type?: string,
 *   intent_pre?: string,
 *   intent_refined?: string,
 *   ia_chamada?: string,
 *   route_channel?: string,
 *   ok?: boolean,
 *   summary?: string,
 *   meta?: object
 * }} payload
 */
async function audit(payload) {
  const enriched = { ...payload, timestamp: new Date().toISOString() };
  /** Shadow: observabilidade via EVENT_PIPELINE_SHADOW; não duplicar nem persistir auditoria canónica. */
  if (process.env.IMPETUS_EVENT_PIPELINE_SHADOW !== 'true') {
    _stdout(enriched);
  }
  if (process.env.IMPETUS_EVENT_PIPELINE_SHADOW !== 'true' && process.env.IMPETUS_EVENT_AUDIT_DB_TABLE) {
    await _insertDb(enriched);
  }
}

module.exports = { audit };
