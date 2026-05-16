'use strict';

/**
 * WAVE 7 — Industrial Traceability Foundation.
 * Chain-of-custody para operações industriais.
 * Rastreia: quem fez o quê, em que domínio, em que workflow, quando.
 * Flag: IMPETUS_TRACEABILITY_ENABLED (default false).
 */

const crypto = require('crypto');
const { TRACEABILITY_ENABLED } = require('./governanceFlags');

let _db = null;
try { _db = require('../db'); } catch (_) {}

/** @type {Array<object>} buffer em memória */
const _memChain = [];
const MAX_MEM = 5000;

let _chainRecords = 0;

/**
 * @typedef {{
 *   traceability_id?: string,
 *   workflow_id: string,
 *   domain: string,
 *   actor_id?: string,
 *   actor_role?: string,
 *   company_id?: string,
 *   action: string,
 *   resource_type?: string,
 *   resource_id?: string,
 *   metadata?: object
 * }} TraceEntry
 */

/**
 * Gera um ID de rastreabilidade único.
 * @returns {string}
 */
function generateTraceabilityId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `TRC-${ts}-${rnd}`;
}

/**
 * Regista um evento de rastreabilidade.
 * @param {TraceEntry} entry
 * @returns {Promise<{ ok: boolean, traceability_id: string, stored: 'db'|'memory'|'disabled' }>}
 */
async function recordTraceEvent(entry) {
  const traceId = entry.traceability_id || generateTraceabilityId();

  if (!TRACEABILITY_ENABLED) {
    return { ok: true, traceability_id: traceId, stored: 'disabled' };
  }

  const record = {
    traceability_id: traceId,
    workflow_id: entry.workflow_id,
    domain: String(entry.domain || 'unknown'),
    actor_id: entry.actor_id || null,
    actor_role: entry.actor_role || null,
    company_id: entry.company_id || null,
    action: String(entry.action || 'unknown'),
    resource_type: entry.resource_type || null,
    resource_id: entry.resource_id || null,
    metadata: entry.metadata || null,
    recorded_at: new Date().toISOString()
  };

  if (_db) {
    try {
      await _db.query(
        `INSERT INTO industrial_traceability_chain
         (traceability_id, workflow_id, domain, actor_id, actor_role, company_id,
          action, resource_type, resource_id, metadata, recorded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          record.traceability_id, record.workflow_id, record.domain,
          record.actor_id, record.actor_role, record.company_id,
          record.action, record.resource_type, record.resource_id,
          record.metadata ? JSON.stringify(record.metadata) : null,
          record.recorded_at
        ]
      );
      _chainRecords++;
      return { ok: true, traceability_id: traceId, stored: 'db' };
    } catch { /* fallthrough */ }
  }

  if (_memChain.length >= MAX_MEM) _memChain.shift();
  _memChain.push(record);
  _chainRecords++;
  return { ok: true, traceability_id: traceId, stored: 'memory' };
}

/**
 * Lista a cadeia de rastreabilidade para um workflow (em memória).
 * @param {string} workflowId
 * @returns {object[]}
 */
function getTraceChainForWorkflow(workflowId) {
  return _memChain.filter((r) => r.workflow_id === workflowId);
}

/**
 * Estatísticas da rastreabilidade.
 */
function getTraceabilityStats() {
  return {
    enabled: TRACEABILITY_ENABLED,
    total_records: _chainRecords,
    memory_buffer_size: _memChain.length
  };
}

module.exports = {
  generateTraceabilityId,
  recordTraceEvent,
  getTraceChainForWorkflow,
  getTraceabilityStats
};
