'use strict';

/**
 * AIOI-P8.1 — Decision Intelligence Service
 *
 * Agregação executiva de inteligência de decisão — READ ONLY.
 * Spec: backend/docs/AIOI_DECISION_INTELLIGENCE_SPECIFICATION.md
 */

const db = require('../../db');
const pilotFlags = require('./aioiPilotFlags');
const operationalKnowledge = require('./aioiOperationalKnowledgeService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const operationalRiskRegister = require('./aioiOperationalRiskRegisterService');
const slaCompliance = require('./aioiSlaComplianceService');
const operationalEvidence = require('./aioiOperationalEvidenceService');
const decisionMetrics = require('./aioiDecisionMetrics');

const LAYER = 'AIOI_DECISION_INTELLIGENCE';

async function _queryOperationalHistory(tenantIds) {
  if (!tenantIds.length) {
    return { ioe_total: 0, with_decision: 0, resolved: 0, with_outcome: 0 };
  }
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);
    const result = await client.query(
      `SELECT
         COUNT(*) AS ioe_total,
         COUNT(*) FILTER (WHERE decision_type IS NOT NULL) AS with_decision,
         COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) AS resolved,
         COUNT(*) FILTER (WHERE decision_payload->'aioi_outcome' IS NOT NULL) AS with_outcome
       FROM industrial_operational_events
       WHERE company_id = ANY($1::uuid[])`,
      [tenantIds]
    );
    await client.query('COMMIT');
    const row = result.rows[0] || {};
    return {
      ioe_total:     parseInt(row.ioe_total || '0', 10),
      with_decision: parseInt(row.with_decision || '0', 10),
      resolved:      parseInt(row.resolved || '0', 10),
      with_outcome:  parseInt(row.with_outcome || '0', 10)
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro operational history`, { error: err.message });
    return { ioe_total: 0, with_decision: 0, resolved: 0, with_outcome: 0 };
  } finally {
    client.release();
  }
}

/**
 * Agrega inteligência de decisão executiva.
 * @returns {Promise<object>}
 */
async function aggregateDecisionIntelligence() {
  const tenants = pilotFlags.getPilotTenants();
  const [history, knowledge, compliance, risk, sla, evidence] = await Promise.all([
    _queryOperationalHistory(tenants),
    operationalKnowledge.consolidateOperationalKnowledge(),
    complianceAnalytics.getComplianceAnalytics(),
    operationalRiskRegister.getOperationalRiskRegister(),
    slaCompliance.getSlaComplianceSnapshot(),
    operationalEvidence.collectOperationalEvidence()
  ]);

  const session = decisionMetrics.getSessionCounters();

  return {
    ok: true,
    layer: LAYER,
    operational_history: {
      ...history,
      pipeline:          evidence.pipeline,
      throughput:          evidence.throughput,
      session_decisions:   session.generated_decisions
    },
    outcome_aggregation: {
      catalog:    knowledge.outcome_catalog,
      total:      knowledge.outcome_catalog.reduce((s, o) => s + o.occurrence_count, 0)
    },
    compliance_aggregation: {
      overall_score:         compliance.overall_compliance_score,
      workflow_compliance:   compliance.workflow_compliance,
      governance_compliance: compliance.governance_compliance,
      sla_compliance:        compliance.sla_compliance
    },
    risk_aggregation: {
      risk_score:      risk.risk_score,
      risk_level:      risk.risk_level,
      recurring_risks: knowledge.recurring_risks
    },
    sla_aggregation: {
      compliance_rate: sla.sla_compliance_rate,
      breached:        sla.sla_breached,
      at_risk:         sla.sla_at_risk,
      patterns:        knowledge.sla_patterns
    },
    pilot_tenant_count: tenants.length,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  aggregateDecisionIntelligence,
  LAYER
};
