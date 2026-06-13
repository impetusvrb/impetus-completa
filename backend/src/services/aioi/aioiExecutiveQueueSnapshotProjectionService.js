'use strict';

/**
 * AIOI-ORG-5 — Executive Queue Snapshot Projection Service
 *
 * Materializa aioi_executive_queue_snapshot a partir de IOEs triaged.
 * NÃO reconstrói fila a partir do F47.
 * NÃO recalcula priority_score — usa valor já persistido no IOE.
 *
 * ORG-1: aioi_executive_queue_snapshot = AUTHORITATIVE
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const { isValidUUID } = require('../../utils/security');
const slaEngine = require('./aioiSlaEngineService');

const LAYER = 'AIOI_QUEUE_SNAPSHOT_PROJECTION';
const DEFAULT_LIMIT = 20;

/**
 * Busca IOEs elegíveis para a fila CEO (triaged+).
 * @param {object} client
 * @param {string} companyId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function _fetchQueueEligibleIoes(client, companyId, limit) {
  const result = await client.query(
    `SELECT id, company_id, tenant_key, status, category, source_type,
            priority_band, priority_score, truth_state, scores_provisional,
            entity_type, entity_id, equipment_id, classification_conf,
            sla_class, due_at, aging_hours, breach_state, escalation_level,
            evidence_refs, correlation_id, created_at, updated_at
     FROM industrial_operational_events
     WHERE company_id = $1::uuid
       AND status IN ('triaged', 'pending_approval', 'approved', 'in_progress')
       AND audience_key = 'ceo'
     ORDER BY priority_score DESC, created_at ASC
     LIMIT $2`,
    [companyId, Math.min(Math.max(limit, 1), 100)]
  );
  return result.rows || [];
}

/**
 * Converte IOE em item de fila para snapshot.
 * @param {object} ioe
 * @returns {object}
 */
function buildQueueItem(ioe) {
  const sla = slaEngine.computeSlaSnapshot(ioe);
  return {
    ioe_id:           ioe.id,
    rank:             null,
    category:         ioe.category,
    source_type:      ioe.source_type,
    priority_band:    ioe.priority_band,
    priority_score:   ioe.priority_score,
    truth_state:      ioe.truth_state,
    scores_provisional: ioe.scores_provisional,
    entity_type:      ioe.entity_type,
    entity_id:        ioe.entity_id,
    equipment_id:     ioe.equipment_id,
    status:           ioe.status,
    classification_conf: ioe.classification_conf,
    sla_class:        sla.sla_class,
    due_at:           sla.due_at,
    aging_hours:      sla.aging_hours,
    breach_state:     sla.breach_state,
    escalation_level: sla.escalation_level,
    evidence_refs:    ioe.evidence_refs || [],
    correlation_id:   ioe.correlation_id,
    created_at:       ioe.created_at,
    updated_at:       ioe.updated_at
  };
}

/**
 * Gera e persiste snapshot da fila executiva CEO.
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} [params.tenantKey]
 * @param {number} [params.limit=20]
 * @returns {Promise<{ ok: boolean, snapshot_id?: string, item_count?: number, error?: string }>}
 */
async function projectExecutiveQueueSnapshot({ companyId, tenantKey, limit = DEFAULT_LIMIT }) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const ioes = await _fetchQueueEligibleIoes(client, companyId, limit);
    const items = ioes.map((ioe, idx) => ({ ...buildQueueItem(ioe), rank: idx + 1 }));

    const snapshotId = uuidv4();
    const correlationId = `queue-snapshot-${uuidv4()}`;
    const idempotencyKey = `queue:${companyId}:${new Date().toISOString().slice(0, 16)}`;
    const resolvedTenantKey = tenantKey || String(companyId);

    await client.query(
      `INSERT INTO aioi_executive_queue_snapshot (
         id, company_id, tenant_key, snapshot_version, generated_at,
         authority, source_table, item_count, items,
         idempotency_key, correlation_id
       ) VALUES (
         $1::uuid, $2::uuid, $3, 1, now(),
         'aioi', 'industrial_operational_events', $4, $5::jsonb,
         $6, $7
       )`,
      [
        snapshotId,
        companyId,
        resolvedTenantKey,
        items.length,
        JSON.stringify(items),
        idempotencyKey,
        correlationId
      ]
    );

    await client.query('COMMIT');

    console.info(`[${LAYER}] Snapshot gerado`, {
      snapshot_id: snapshotId,
      company_id: companyId,
      item_count: items.length
    });

    return { ok: true, snapshot_id: snapshotId, item_count: items.length, items };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro ao projetar snapshot`, { company_id: companyId, error: err.message });
    return { ok: false, error: err.message };
  } finally {
    client.release();
  }
}

/**
 * Busca o snapshot mais recente para uma empresa.
 * @param {string} companyId
 * @returns {Promise<object|null>}
 */
async function fetchLatestSnapshot(companyId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const result = await client.query(
      `SELECT id, company_id, tenant_key, snapshot_version, generated_at,
              authority, source_table, item_count, items, correlation_id
       FROM aioi_executive_queue_snapshot
       WHERE company_id = $1::uuid
       ORDER BY generated_at DESC
       LIMIT 1`,
      [companyId]
    );

    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro ao buscar snapshot`, { company_id: companyId, error: err.message });
    return null;
  } finally {
    client.release();
  }
}

module.exports = {
  projectExecutiveQueueSnapshot,
  fetchLatestSnapshot,
  buildQueueItem,
  DEFAULT_LIMIT,
  LAYER
};
