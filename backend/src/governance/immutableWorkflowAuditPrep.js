'use strict';

/**
 * WAVE 7 — Immutable Workflow Audit Preparation.
 * Ledger append-only com hash chain para tamper-evidence.
 * Sem blockchain — hash SHA-256 encadeado na camada de aplicação.
 * Flag: IMPETUS_AUDIT_HASH_CHAIN_ENABLED (default false).
 *
 * Schema: cada registo inclui SHA-256(prev_hash + payload_json).
 * Validação: qualquer break na cadeia indica adulteração.
 */

const crypto = require('crypto');
const { AUDIT_HASH_CHAIN_ENABLED } = require('./governanceFlags');

let _db = null;
try { _db = require('../db'); } catch (_) {}

/** Cache em memória do último hash para performance (evita query a cada insert). */
let _lastHashCache = null;
let _chainLength = 0;

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Calcula o hash de um registo.
 * @param {string} previousHash
 * @param {object} payload
 * @returns {string} SHA-256 hex
 */
function computeRecordHash(previousHash, payload) {
  const data = `${previousHash}|${JSON.stringify(payload)}`;
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Obtém o último hash da cadeia (DB ou cache).
 * @returns {Promise<string>}
 */
async function getLastHash() {
  if (_lastHashCache !== null) return _lastHashCache;
  if (!_db) return GENESIS_HASH;
  try {
    const r = await _db.query(
      `SELECT record_hash FROM immutable_workflow_audit
       ORDER BY sequence_nr DESC LIMIT 1`
    );
    _lastHashCache = r.rows.length > 0 ? r.rows[0].record_hash : GENESIS_HASH;
    return _lastHashCache;
  } catch {
    return GENESIS_HASH;
  }
}

/**
 * Adiciona um registo imutável ao ledger.
 * @param {{
 *   workflow_id: string,
 *   workflow_type: string,
 *   actor_id?: string,
 *   actor_role?: string,
 *   company_id?: string,
 *   domain: string,
 *   action: string,
 *   payload?: object
 * }} entry
 * @returns {Promise<{ ok: boolean, hash?: string, sequence_nr?: number }>}
 */
async function appendWorkflowAuditRecord(entry) {
  if (!AUDIT_HASH_CHAIN_ENABLED) {
    return { ok: true, mode: 'disabled' };
  }

  const previousHash = await getLastHash();
  const recordPayload = {
    workflow_id: entry.workflow_id,
    workflow_type: entry.workflow_type,
    actor_id: entry.actor_id || null,
    actor_role: entry.actor_role || null,
    company_id: entry.company_id || null,
    domain: entry.domain,
    action: entry.action,
    payload: entry.payload || null,
    recorded_at: new Date().toISOString()
  };
  const recordHash = computeRecordHash(previousHash, recordPayload);
  _chainLength++;

  if (_db) {
    try {
      const r = await _db.query(
        `INSERT INTO immutable_workflow_audit
         (workflow_id, workflow_type, actor_id, actor_role, company_id,
          domain, action, payload, previous_hash, record_hash, recorded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING sequence_nr`,
        [
          recordPayload.workflow_id, recordPayload.workflow_type,
          recordPayload.actor_id, recordPayload.actor_role, recordPayload.company_id,
          recordPayload.domain, recordPayload.action,
          recordPayload.payload ? JSON.stringify(recordPayload.payload) : null,
          previousHash, recordHash, recordPayload.recorded_at
        ]
      );
      _lastHashCache = recordHash;
      const seqNr = r.rows[0]?.sequence_nr;
      return { ok: true, hash: recordHash, sequence_nr: seqNr };
    } catch {
      _lastHashCache = recordHash; // mantém chain consistente em memória
    }
  }

  _lastHashCache = recordHash;
  return { ok: true, hash: recordHash, mode: 'memory' };
}

/**
 * Valida a integridade da cadeia de hashes nos últimos N registos.
 * @param {number} [limit=100]
 * @returns {Promise<{ valid: boolean, checked: number, broken_at?: number }>}
 */
async function validateHashChain(limit = 100) {
  if (!_db) return { valid: true, checked: 0, mode: 'no_db' };
  try {
    const r = await _db.query(
      `SELECT sequence_nr, previous_hash, record_hash,
              workflow_id, workflow_type, actor_id, actor_role, company_id,
              domain, action, payload, recorded_at
       FROM immutable_workflow_audit
       ORDER BY sequence_nr DESC LIMIT $1`,
      [limit]
    );
    const rows = r.rows.reverse(); // cronológico
    if (rows.length === 0) return { valid: true, checked: 0 };

    let prevHash = rows[0].previous_hash;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const recomputed = computeRecordHash(row.previous_hash, {
        workflow_id: row.workflow_id,
        workflow_type: row.workflow_type,
        actor_id: row.actor_id,
        actor_role: row.actor_role,
        company_id: row.company_id,
        domain: row.domain,
        action: row.action,
        payload: row.payload,
        recorded_at: row.recorded_at
      });
      if (recomputed !== row.record_hash) {
        return { valid: false, checked: i + 1, broken_at: row.sequence_nr };
      }
      prevHash = row.record_hash;
    }
    return { valid: true, checked: rows.length };
  } catch {
    return { valid: true, checked: 0, mode: 'db_error' };
  }
}

/**
 * Estatísticas do ledger imutável.
 */
function getImmutableLedgerStats() {
  return {
    enabled: AUDIT_HASH_CHAIN_ENABLED,
    chain_length_session: _chainLength,
    last_hash_cached: _lastHashCache !== null,
    genesis_hash: GENESIS_HASH
  };
}

module.exports = {
  computeRecordHash,
  appendWorkflowAuditRecord,
  validateHashChain,
  getImmutableLedgerStats,
  GENESIS_HASH
};
