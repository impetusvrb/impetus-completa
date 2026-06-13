'use strict';

/**
 * AIOI-P5.4 — Compliance Analytics Service
 *
 * Analytics de compliance enterprise — READ ONLY.
 * Spec: backend/docs/AIOI_COMPLIANCE_ANALYTICS_SPECIFICATION.md
 */

const slaCompliance = require('./aioiSlaComplianceService');
const governanceDrift = require('./aioiGovernanceDriftService');
const scalabilityValidation = require('./aioiScalabilityValidationService');
const enterpriseGovernance = require('./aioiEnterpriseGovernanceService');
const operationalTrends = require('./aioiOperationalTrendService');
const pilotFlags = require('./aioiPilotFlags');

const LAYER = 'AIOI_COMPLIANCE_ANALYTICS';

/**
 * Snapshot de analytics de compliance enterprise.
 * @returns {Promise<object>}
 */
async function getComplianceAnalytics() {
  const [sla, drift, scalability, governance, trends] = await Promise.all([
    slaCompliance.getSlaComplianceSnapshot(),
    Promise.resolve(governanceDrift.detectGovernanceDrift()),
    scalabilityValidation.validateScalability(),
    enterpriseGovernance.getGovernanceComplianceSnapshot(),
    Promise.resolve(operationalTrends.getOperationalTrends())
  ]);

  const pilotValidation = pilotFlags.validatePilotConfig();
  const workflowCompliance = governance.policy_adherence.policies.workflow_governance
    && governance.policy_adherence.policies.execution_governance;

  const tenantCompliance = pilotValidation.ok
    && pilotValidation.pilot_tenants.length <= pilotFlags.MAX_PILOT_TENANTS;

  const governanceCompliance = !drift.drift_detected
    && governance.policy_adherence.all_policies_met;

  const operationalCompliance = scalability.validated
    && governance.operational_governance_summary.aioi_enabled !== undefined;

  const complianceTrends = {
    sla_trend:        trends.trends?.sla_trend || 'UNKNOWN',
    dlq_trend:        trends.trends?.dlq_trend || 'UNKNOWN',
    health_trend:     trends.trends?.health_trend || 'UNKNOWN',
    throughput_trend: trends.trends?.throughput_trend || 'UNKNOWN'
  };

  const overallScore = Math.round((
    (sla.sla_compliance_rate * 0.25)
    + (governance.governance_maturity_score * 0.35)
    + (scalability.pass_count / scalability.total_checks * 100 * 0.25)
    + (governance.policy_adherence.adherence_pct * 0.15)
  ) * 100) / 100;

  return {
    ok: true,
    layer: LAYER,
    workflow_compliance:     workflowCompliance,
    sla_compliance: {
      rate:     sla.sla_compliance_rate,
      breached: sla.sla_breached,
      at_risk:  sla.sla_at_risk
    },
    tenant_compliance:       tenantCompliance,
    governance_compliance:   governanceCompliance,
    operational_compliance:  operationalCompliance,
    compliance_trends:       complianceTrends,
    overall_compliance_score: overallScore,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getComplianceAnalytics,
  LAYER
};
