'use strict';

/**
 * CERT-EVENT-RETENTION-01 — Explainability para eventos arquivados.
 * Explica origem, data, estado, política e integridade sem alterar consumidores.
 */

const db = require('../../db');
const { classifyEvent } = require('./eventBackboneCategoryRegistry');
const { LIFECYCLE_STATES } = require('./eventLifecycleStates');
const eventArchive = require('./eventArchiveService');

async function loadPolicyForCategory(category) {
  try {
    const r = await db.query(
      `SELECT * FROM event_backbone_retention_policy WHERE category = $1 LIMIT 1`,
      [category]
    );
    return r.rows?.[0] || null;
  } catch (_e) {
    return null;
  }
}

/**
 * @param {string} archiveId
 * @returns {Promise<object>}
 */
async function explainArchivedEvent(archiveId) {
  const r = await db.query(
    `SELECT id, event_name, domain, company_id, lifecycle_state, event_category,
            correlation_id, archived_at, created_at, delivered_at, integrity_checksum,
            explainability, metadata, (compressed_payload IS NOT NULL) AS is_compressed
     FROM industrial_event_archive WHERE id = $1::uuid LIMIT 1`,
    [archiveId]
  );
  const row = r.rows?.[0];
  if (!row) {
    return { ok: false, reason: 'not_found', archive_id: archiveId };
  }

  const category = row.event_category || classifyEvent({
    domain: row.domain,
    event_name: row.event_name
  });
  const policy = await loadPolicyForCategory(category);
  const integrity = await eventArchive.validateIntegrity(archiveId);

  let auditTrail = [];
  try {
    const ar = await db.query(
      `SELECT trace_id, from_state, to_state, policy_id, reason, actor_type, created_at
       FROM event_backbone_lifecycle_audit
       WHERE event_ref_id = $1::uuid
       ORDER BY created_at ASC
       LIMIT 20`,
      [archiveId]
    );
    auditTrail = ar.rows || [];
  } catch (_e) {
    auditTrail = [];
  }

  return {
    ok: true,
    explainability: {
      archive_id: row.id,
      origin: {
        source_table: 'industrial_event_archive',
        event_name: row.event_name,
        domain: row.domain,
        company_id: row.company_id,
        correlation_id: row.correlation_id
      },
      timeline: {
        created_at: row.created_at,
        delivered_at: row.delivered_at,
        archived_at: row.archived_at
      },
      lifecycle: {
        current_state: row.lifecycle_state || LIFECYCLE_STATES.ARCHIVED,
        category,
        is_compressed: !!row.is_compressed
      },
      policy_applied: policy
        ? {
            id: policy.id,
            display_name: policy.display_name,
            active_days: policy.active_days,
            archive_days: policy.archive_days,
            historical_days: policy.historical_days,
            purge_allowed: policy.purge_allowed,
            legal_basis: policy.legal_basis
          }
        : null,
      integrity: {
        valid: integrity.valid !== false,
        checksum: integrity.checksum || row.integrity_checksum,
        stored_checksum: integrity.stored_checksum
      },
      metadata: row.explainability || {},
      audit_trail: auditTrail,
      note: 'Evento arquivado — disponível para auditoria, investigação e consultas históricas. Não participa de consultas operacionais.'
    }
  };
}

module.exports = {
  explainArchivedEvent,
  loadPolicyForCategory
};
