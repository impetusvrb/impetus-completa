'use strict';

const db = require('../db');

/**
 * Append-only: apenas INSERT. Sem UPDATE/DELETE.
 *
 * @param {object} row
 * @param {string} row.trace_id
 * @param {string} row.company_id
 * @param {string} [row.user_id]
 * @param {'ACCESS'|'PROCESS'|'BLOCK'|'ANONYMIZE'} row.action_type
 * @param {object} row.data_classification
 * @param {string} [row.legal_basis]
 * @param {string} [row.risk_level]
 * @param {string} [row.decision_summary]
 */
async function insertLegalAuditLog(row) {
  if (!row?.trace_id || !row?.company_id || !row.action_type) return null;
  const r = await db.query(
    `
    INSERT INTO ai_legal_audit_logs (
      trace_id, company_id, user_id, action_type,
      data_classification, legal_basis, risk_level, decision_summary
    ) VALUES ($1::uuid, $2::uuid, $3, $4, $5::jsonb, $6, $7, $8)
    RETURNING id
    `,
    [
      row.trace_id,
      row.company_id,
      row.user_id || null,
      String(row.action_type).slice(0, 24),
      JSON.stringify(row.data_classification || {}),
      row.legal_basis != null ? String(row.legal_basis).slice(0, 48) : null,
      row.risk_level != null ? String(row.risk_level).slice(0, 16) : null,
      row.decision_summary != null ? String(row.decision_summary).slice(0, 8000) : null
    ]
  );
  return r.rows[0]?.id || null;
}

function enqueueLegalAudit(row) {
  setImmediate(() => {
    insertLegalAuditLog(row).catch((e) => {
      console.warn('[AI_LEGAL_AUDIT]', e?.message || e);
    });
  });
}

module.exports = {
  insertLegalAuditLog,
  enqueueLegalAudit
};
