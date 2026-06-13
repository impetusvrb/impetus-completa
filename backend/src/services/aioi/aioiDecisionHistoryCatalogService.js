'use strict';

/**
 * AIOI-P8.2 — Decision History Catalog Service
 *
 * Catálogo histórico de decisões — READ ONLY, sem modificar histórico.
 * Spec: backend/docs/AIOI_DECISION_HISTORY_SPECIFICATION.md
 */

const db = require('../../db');
const pilotFlags = require('./aioiPilotFlags');
const auditTrail = require('./aioiAuditTrailService');

const LAYER = 'AIOI_DECISION_HISTORY_CATALOG';

async function _queryHistoryByDimension(tenantIds) {
  if (!tenantIds.length) {
    return {
      decision_types: [], decision_outcomes: [], execution_outcomes: [],
      tenant_outcomes: [], workflow_outcomes: []
    };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);

    const [typesResult, outcomesResult, execResult, tenantResult, workflowResult] = await Promise.all([
      client.query(
        `SELECT decision_type, COUNT(*) AS cnt
         FROM industrial_operational_events
         WHERE company_id = ANY($1::uuid[]) AND decision_type IS NOT NULL
         GROUP BY decision_type ORDER BY cnt DESC`,
        [tenantIds]
      ),
      client.query(
        `SELECT
           decision_payload->'aioi_outcome'->>'outcome_type' AS outcome_type,
           COUNT(*) AS cnt
         FROM industrial_operational_events
         WHERE company_id = ANY($1::uuid[])
           AND decision_payload->'aioi_outcome' IS NOT NULL
         GROUP BY outcome_type ORDER BY cnt DESC`,
        [tenantIds]
      ),
      client.query(
        `SELECT status, COUNT(*) AS cnt
         FROM industrial_operational_events
         WHERE company_id = ANY($1::uuid[])
           AND decision_type = 'direct_action'
         GROUP BY status ORDER BY cnt DESC`,
        [tenantIds]
      ),
      client.query(
        `SELECT company_id::text, status, COUNT(*) AS cnt
         FROM industrial_operational_events
         WHERE company_id = ANY($1::uuid[])
           AND decision_type IS NOT NULL
         GROUP BY company_id, status ORDER BY cnt DESC`,
        [tenantIds]
      ),
      client.query(
        `SELECT status, COUNT(*) AS cnt
         FROM industrial_operational_events
         WHERE company_id = ANY($1::uuid[])
           AND decision_type = 'workflow'
         GROUP BY status ORDER BY cnt DESC`,
        [tenantIds]
      )
    ]);

    await client.query('COMMIT');

    return {
      decision_types: (typesResult.rows || []).map(r => ({
        decision_type: r.decision_type,
        count:         parseInt(r.cnt || '0', 10)
      })),
      decision_outcomes: (outcomesResult.rows || []).map(r => ({
        outcome_type: r.outcome_type || 'unknown',
        count:        parseInt(r.cnt || '0', 10)
      })),
      execution_outcomes: (execResult.rows || []).map(r => ({
        status: r.status,
        count:  parseInt(r.cnt || '0', 10)
      })),
      tenant_outcomes: (tenantResult.rows || []).map(r => ({
        company_id: r.company_id,
        status:     r.status,
        count:      parseInt(r.cnt || '0', 10)
      })),
      workflow_outcomes: (workflowResult.rows || []).map(r => ({
        status: r.status,
        count:  parseInt(r.cnt || '0', 10)
      }))
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro history catalog`, { error: err.message });
    return {
      decision_types: [], decision_outcomes: [], execution_outcomes: [],
      tenant_outcomes: [], workflow_outcomes: []
    };
  } finally {
    client.release();
  }
}

/**
 * Consolida catálogo histórico de decisões.
 * @returns {Promise<object>}
 */
async function getDecisionHistoryCatalog() {
  const tenants = pilotFlags.getPilotTenants();
  const [dimensions, trail] = await Promise.all([
    _queryHistoryByDimension(tenants),
    Promise.resolve(auditTrail.getConsolidatedAuditTrail())
  ]);

  const entryCount = dimensions.decision_types.length
    + dimensions.decision_outcomes.length
    + dimensions.execution_outcomes.length
    + dimensions.tenant_outcomes.length
    + dimensions.workflow_outcomes.length;

  return {
    ok: true,
    layer: LAYER,
    decision_types:      dimensions.decision_types,
    decision_outcomes:   dimensions.decision_outcomes,
    execution_outcomes:  dimensions.execution_outcomes,
    tenant_outcomes:     dimensions.tenant_outcomes,
    workflow_outcomes:   dimensions.workflow_outcomes,
    audit_trail_summary: {
      telemetry_events: trail.telemetry_event_count,
      worker_cycles:    trail.worker_audit.processing_cycles
    },
    catalog_entry_count: entryCount,
    history_mutation:    false,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getDecisionHistoryCatalog,
  LAYER
};
