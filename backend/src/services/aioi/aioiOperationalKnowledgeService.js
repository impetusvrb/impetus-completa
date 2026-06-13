'use strict';

/**
 * AIOI-P7.1 — Operational Knowledge Service
 *
 * Consolidação de conhecimento operacional corporativo — READ ONLY.
 * Spec: backend/docs/AIOI_OPERATIONAL_KNOWLEDGE_SPECIFICATION.md
 */

const db = require('../../db');
const pilotFlags = require('./aioiPilotFlags');
const slaCompliance = require('./aioiSlaComplianceService');
const operationalRiskRegister = require('./aioiOperationalRiskRegisterService');
const operationalEvidence = require('./aioiOperationalEvidenceService');

const LAYER = 'AIOI_OPERATIONAL_KNOWLEDGE';

async function _queryRecurringEvents(tenantIds) {
  if (!tenantIds.length) return [];
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);
    const result = await client.query(
      `SELECT category, source_type, COUNT(*) AS occurrence_count
       FROM industrial_operational_events
       WHERE company_id = ANY($1::uuid[])
       GROUP BY category, source_type
       HAVING COUNT(*) >= 1
       ORDER BY occurrence_count DESC
       LIMIT 50`,
      [tenantIds]
    );
    await client.query('COMMIT');
    return (result.rows || []).map(r => ({
      category:       r.category,
      source_type:    r.source_type,
      occurrence_count: parseInt(r.occurrence_count || '0', 10)
    }));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro recurring events`, { error: err.message });
    return [];
  } finally {
    client.release();
  }
}

async function _queryOutcomeCatalog(tenantIds) {
  if (!tenantIds.length) return [];
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);
    const result = await client.query(
      `SELECT
         decision_payload->'aioi_outcome'->>'outcome_type' AS outcome_type,
         COUNT(*) AS occurrence_count
       FROM industrial_operational_events
       WHERE company_id = ANY($1::uuid[])
         AND decision_payload->'aioi_outcome' IS NOT NULL
       GROUP BY outcome_type
       ORDER BY occurrence_count DESC`,
      [tenantIds]
    );
    await client.query('COMMIT');
    return (result.rows || []).map(r => ({
      outcome_type:     r.outcome_type || 'unknown',
      occurrence_count: parseInt(r.occurrence_count || '0', 10)
    }));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return [];
  } finally {
    client.release();
  }
}

async function _querySlaPatterns(tenantIds) {
  if (!tenantIds.length) return [];
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);
    const result = await client.query(
      `SELECT priority_band, breach_state, COUNT(*) AS occurrence_count
       FROM industrial_operational_events
       WHERE company_id = ANY($1::uuid[])
         AND breach_state IS NOT NULL
       GROUP BY priority_band, breach_state
       ORDER BY occurrence_count DESC`,
      [tenantIds]
    );
    await client.query('COMMIT');
    return (result.rows || []).map(r => ({
      priority_band:    r.priority_band || 'unknown',
      breach_state:     r.breach_state,
      occurrence_count: parseInt(r.occurrence_count || '0', 10)
    }));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return [];
  } finally {
    client.release();
  }
}

/**
 * Consolida conhecimento operacional corporativo.
 * @returns {Promise<object>}
 */
async function consolidateOperationalKnowledge() {
  const tenants = pilotFlags.getPilotTenants();
  const [events, outcomes, slaPatterns, sla, evidence, risk] = await Promise.all([
    _queryRecurringEvents(tenants),
    _queryOutcomeCatalog(tenants),
    _querySlaPatterns(tenants),
    slaCompliance.getSlaComplianceSnapshot(),
    operationalEvidence.collectOperationalEvidence(),
    operationalRiskRegister.getOperationalRiskRegister()
  ]);

  const recurringRisks = [
    {
      category: 'governance',
      level:    risk.governance_risk.level,
      score:    risk.governance_risk.score,
      drift:    risk.governance_risk.drift_detected
    },
    {
      category: 'operational',
      level:    risk.operational_risk.level,
      score:    risk.operational_risk.score,
      health:   risk.operational_risk.health_status
    },
    {
      category: 'sla',
      level:    risk.sla_risk.level,
      score:    risk.sla_risk.score,
      breached: risk.sla_risk.breached
    },
    {
      category: 'capacity',
      level:    risk.capacity_risk.level,
      score:    risk.capacity_risk.score,
      saturated: risk.capacity_risk.saturated_tenants
    }
  ].filter(r => r.score > 0 || r.level !== 'MINIMAL');

  return {
    ok: true,
    layer: LAYER,
    operational_knowledge: {
      pilot_tenant_count: tenants.length,
      pipeline:           evidence.pipeline,
      throughput:         evidence.throughput
    },
    recurring_events:     events,
    outcome_catalog:      outcomes,
    sla_patterns:         slaPatterns,
    recurring_risks:      recurringRisks,
    sla_snapshot: {
      compliance_rate: sla.sla_compliance_rate,
      breached:        sla.sla_breached,
      at_risk:         sla.sla_at_risk
    },
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  consolidateOperationalKnowledge,
  LAYER
};
