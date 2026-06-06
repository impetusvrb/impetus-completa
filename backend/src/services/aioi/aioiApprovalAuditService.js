'use strict';

/**
 * AIOI-P0.5 — Serviço de auditoria de aprovações HITL
 *
 * Auditoria em memória (sem migration nesta fase).
 * Registra aprovações e rejeições humanas para rastreabilidade.
 *
 * PROIBIÇÕES:
 *   ✗ Persistência em banco (P0.5 — mock/in-memory apenas)
 *   ✗ Side-effects operacionais
 */

const LAYER = 'AIOI_APPROVAL_AUDIT';

/** @type {Array<object>} */
let _auditLog = [];

/**
 * Registra uma aprovação humana.
 *
 * @param {object} entry
 * @param {string} entry.company_id
 * @param {string} entry.ioe_id
 * @param {string} entry.user_id
 * @param {string} entry.decision_type
 * @param {string} [entry.correlation_id]
 * @param {string} [entry.notes]
 */
function recordApproval({ company_id, ioe_id, user_id, decision_type, correlation_id, notes }) {
  const entry = {
    company_id,
    ioe_id,
    user_id,
    action:         'approved',
    decision_type:  decision_type || null,
    correlation_id: correlation_id || null,
    timestamp:      new Date().toISOString(),
    notes:          notes ? String(notes).slice(0, 500) : null
  };
  _auditLog.push(entry);
  console.info(`[${LAYER}] Auditoria: aprovação registrada`, {
    company_id: entry.company_id,
    ioe_id:     entry.ioe_id,
    user_id:    entry.user_id,
    action:     entry.action
  });
  return entry;
}

/**
 * Registra uma rejeição humana.
 *
 * @param {object} entry
 * @param {string} entry.company_id
 * @param {string} entry.ioe_id
 * @param {string} entry.user_id
 * @param {string} entry.decision_type
 * @param {string} [entry.correlation_id]
 * @param {string} [entry.notes]
 */
function recordRejection({ company_id, ioe_id, user_id, decision_type, correlation_id, notes }) {
  const entry = {
    company_id,
    ioe_id,
    user_id,
    action:         'rejected',
    decision_type:  decision_type || null,
    correlation_id: correlation_id || null,
    timestamp:      new Date().toISOString(),
    notes:          notes ? String(notes).slice(0, 500) : null
  };
  _auditLog.push(entry);
  console.info(`[${LAYER}] Auditoria: rejeição registrada`, {
    company_id: entry.company_id,
    ioe_id:     entry.ioe_id,
    user_id:    entry.user_id,
    action:     entry.action
  });
  return entry;
}

/**
 * Lista entradas de auditoria, opcionalmente filtradas por company_id ou ioe_id.
 *
 * @param {object} [filter]
 * @param {string} [filter.company_id]
 * @param {string} [filter.ioe_id]
 * @returns {object[]}
 */
function listAuditEntries(filter = {}) {
  let entries = [..._auditLog];
  if (filter.company_id) {
    entries = entries.filter(e => e.company_id === filter.company_id);
  }
  if (filter.ioe_id) {
    entries = entries.filter(e => e.ioe_id === filter.ioe_id);
  }
  return entries;
}

/**
 * Zera o log de auditoria (útil para testes).
 */
function clearAuditLog() {
  _auditLog = [];
}

module.exports = {
  recordApproval,
  recordRejection,
  listAuditEntries,
  clearAuditLog
};
