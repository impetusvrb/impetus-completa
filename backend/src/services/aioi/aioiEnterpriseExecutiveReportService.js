'use strict';

/**
 * AIOI-P5.5 — Enterprise Executive Report Service
 *
 * Relatório executivo enterprise — READ ONLY.
 */

const enterpriseGovernance = require('./aioiEnterpriseGovernanceService');
const enterpriseReadiness = require('./aioiEnterpriseReadinessService');
const auditTrail = require('./aioiAuditTrailService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const productionStability = require('./aioiProductionStabilityService');
const scalabilityValidation = require('./aioiScalabilityValidationService');
const governanceDrift = require('./aioiGovernanceDriftService');
const operationalHealth = require('./aioiOperationalHealthService');

const LAYER = 'AIOI_ENTERPRISE_EXECUTIVE_REPORT';

/**
 * Gera relatório executivo enterprise completo.
 * @returns {Promise<object>}
 */
async function generateEnterpriseExecutiveReport() {
  const [governance, readiness, trail, analytics, health, scalability, drift, stability] = await Promise.all([
    enterpriseGovernance.getGovernanceComplianceSnapshot(),
    enterpriseReadiness.validateEnterpriseReadiness(),
    Promise.resolve(auditTrail.getConsolidatedAuditTrail()),
    complianceAnalytics.getComplianceAnalytics(),
    operationalHealth.getHealthSnapshot(),
    scalabilityValidation.validateScalability(),
    Promise.resolve(governanceDrift.detectGovernanceDrift()),
    Promise.resolve(productionStability.getStabilitySnapshot())
  ]);

  const enterpriseRiskSummary = {
    drift_detected:       drift.drift_detected,
    drift_count:          drift.drift_count,
    health_status:        health.status,
    failed_cycles:        stability.failed_cycles,
    dlq_trend:            analytics.compliance_trends.dlq_trend,
    saturation_concerns:  governance.tenant_governance_posture.filter(
      t => t.saturation_level === 'WARNING' || t.saturation_level === 'CRITICAL'
    ).length
  };

  let rolloutRecommendation = 'HOLD';
  if (readiness.enterprise_ready && !drift.drift_detected) {
    rolloutRecommendation = 'PROCEED_CONTROLLED_ROLLOUT';
  } else if (readiness.pass_count >= 6) {
    rolloutRecommendation = 'PILOT_EXPANSION_WITH_MONITORING';
  } else {
    rolloutRecommendation = 'REMEDIATE_BEFORE_ROLLOUT';
  }

  const enterpriseRolloutRecommendation = {
    recommendation:    rolloutRecommendation,
    enterprise_ready:  readiness.enterprise_ready,
    maturity_score:    governance.governance_maturity_score,
    compliance_score:  analytics.overall_compliance_score,
    prerequisites: {
      governance_aligned:    !drift.drift_detected,
      scalability_validated: scalability.validated,
      health_stable:         ['HEALTHY', 'STANDBY'].includes(health.status),
      runtime_cognitive:     false
    }
  };

  return {
    ok: true,
    layer: LAYER,
    enterprise_governance_summary: {
      maturity_score:    governance.governance_maturity_score,
      policy_adherence:  governance.policy_adherence.adherence_pct,
      drift_detected:    drift.drift_detected,
      tenant_posture:    governance.tenant_governance_posture
    },
    enterprise_compliance_summary: {
      overall_score:           analytics.overall_compliance_score,
      workflow_compliance:     analytics.workflow_compliance,
      sla_compliance:          analytics.sla_compliance,
      tenant_compliance:       analytics.tenant_compliance,
      governance_compliance:   analytics.governance_compliance
    },
    enterprise_stability_summary: {
      uptime_hours:      stability.worker_uptime_hours,
      processing_cycles: stability.processing_cycles,
      failed_cycles:     stability.failed_cycles,
      restart_count:     stability.restart_count
    },
    enterprise_scalability_summary: {
      validated:    scalability.validated,
      pass_count:   scalability.pass_count,
      total_checks: scalability.total_checks
    },
    enterprise_risk_summary: enterpriseRiskSummary,
    enterprise_rollout_recommendation: enterpriseRolloutRecommendation,
    audit_trail_summary: {
      telemetry_events: trail.telemetry_event_count,
      worker_cycles:    trail.worker_audit.processing_cycles,
      tenant_count:     trail.tenant_audit.pilot_tenants.length
    },
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateEnterpriseExecutiveReport,
  LAYER
};
