'use strict';

/**
 * WAVE 7 — Industrial Audit Structure.
 * Camada de auditoria industrial sobre o auditOutboxService existente.
 * Dual-write: registo legado mantém-se + stream industrial adicionado.
 * Flag: IMPETUS_INDUSTRIAL_AUDIT_ENABLED (default false).
 */

const { INDUSTRIAL_AUDIT_ENABLED } = require('./governanceFlags');

let _db = null;
try { _db = require('../db'); } catch (_) {}

/** @type {Array<object>} buffer in-memory para quando DB indisponível */
const _memoryBuffer = [];
const MAX_MEMORY = 2000;

let _totalWritten = 0;
let _totalFailed = 0;
let _totalMemory = 0;

/**
 * @typedef {{
 *   event_type: string,
 *   domain: string,
 *   workflow_id?: string,
 *   actor_id?: string,
 *   actor_role?: string,
 *   company_id?: string,
 *   traceability_id?: string,
 *   payload?: object,
 *   severity?: 'info'|'warn'|'critical'
 * }} IndustrialAuditEvent
 */

/**
 * Escreve um evento de auditoria industrial.
 * @param {IndustrialAuditEvent} event
 * @returns {Promise<{ ok: boolean, stored: 'db'|'memory'|'disabled' }>}
 */
async function writeIndustrialAuditEvent(event) {
  if (!INDUSTRIAL_AUDIT_ENABLED) {
    return { ok: true, stored: 'disabled' };
  }

  const record = {
    id: `iae_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    event_type: String(event.event_type || 'unknown'),
    domain: String(event.domain || 'unknown'),
    workflow_id: event.workflow_id || null,
    actor_id: event.actor_id || null,
    actor_role: event.actor_role || null,
    company_id: event.company_id || null,
    traceability_id: event.traceability_id || null,
    payload: event.payload || null,
    severity: event.severity || 'info',
    recorded_at: new Date().toISOString()
  };

  if (_db) {
    try {
      await _db.query(
        `INSERT INTO industrial_audit_events
         (id, event_type, domain, workflow_id, actor_id, actor_role, company_id,
          traceability_id, payload, severity, recorded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          record.id, record.event_type, record.domain, record.workflow_id,
          record.actor_id, record.actor_role, record.company_id,
          record.traceability_id,
          record.payload != null ? JSON.stringify(record.payload) : null,
          record.severity, record.recorded_at
        ]
      );
      _totalWritten++;
      return { ok: true, stored: 'db', id: record.id };
    } catch (err) {
      _totalFailed++;
      // Fallthrough to memory buffer
    }
  }

  // Memory fallback
  if (_memoryBuffer.length >= MAX_MEMORY) _memoryBuffer.shift();
  _memoryBuffer.push(record);
  _totalMemory++;
  return { ok: true, stored: 'memory', id: record.id };
}

/**
 * Retorna estatísticas do audit structure.
 */
function getAuditStats() {
  return {
    enabled: INDUSTRIAL_AUDIT_ENABLED,
    total_written: _totalWritten,
    total_failed: _totalFailed,
    memory_buffer_size: _memoryBuffer.length,
    total_memory_fallback: _totalMemory
  };
}

/**
 * Lista eventos em memória (para draining manual ou debug).
 */
function listMemoryAuditBuffer() {
  return [..._memoryBuffer];
}

module.exports = {
  writeIndustrialAuditEvent,
  getAuditStats,
  listMemoryAuditBuffer
};
