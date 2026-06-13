'use strict';

/**
 * AIOI-P6.4 — Enterprise Assurance Report Service
 *
 * Relatório executivo de assurance enterprise — READ ONLY.
 */

const governanceAssurance = require('./aioiGovernanceAssuranceService');
const certificationDrift = require('./aioiCertificationDriftService');
const longitudinalAnalytics = require('./aioiLongitudinalAnalyticsService');
const operationalRiskRegister = require('./aioiOperationalRiskRegisterService');
const continuousReadiness = require('./aioiContinuousCertificationReadinessService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const enterpriseGovernance = require('./aioiEnterpriseGovernanceService');
const productionStability = require('./aioiProductionStabilityService');
const scalabilityValidation = require('./aioiScalabilityValidationService');

const LAYER = 'AIOI_ENTERPRISE_ASSURANCE_REPORT';

/**
 * Gera relatório executivo de assurance enterprise.
 * @returns {Promise<object>}
 */
async function generateEnterpriseAssuranceReport() {
  const [assurance, certDrift, analytics, risk, readiness, compliance, governance, stability, scalability] = await Promise.all([
    governanceAssurance.validateContinuousGovernance(),
    Promise.resolve(certificationDrift.detectCertificationDrift()),
    longitudinalAnalytics.getLongitudinalAnalytics(),
    operationalRiskRegister.getOperationalRiskRegister(),
    continuousReadiness.validateContinuousCertificationReadiness(),
    complianceAnalytics.getComplianceAnalytics(),
    enterpriseGovernance.getGovernanceComplianceSnapshot(),
    Promise.resolve(productionStability.getStabilitySnapshot()),
    scalabilityValidation.validateScalability()
  ]);

  let recommendation = 'HOLD_ASSURANCE_MONITORING';
  if (readiness.continuous_readiness && !certDrift.certification_drift_detected) {
    recommendation = 'CONTINUE_CONTROLLED_ENTERPRISE_ROLLOUT';
  } else if (readiness.pass_count >= 6) {
    recommendation = 'REMEDIATE_AND_REASSESS';
  } else {
    recommendation = 'ESCALATE_GOVERNANCE_REVIEW';
  }

  return {
    ok: true,
    layer: LAYER,
    governance_assurance_summary: {
      assurance_score:      assurance.governance_assurance_score,
      policy_adherence_pct: assurance.policy_assurance.adherence_pct,
      sovereigns_protected: assurance.sovereign_protection_verification.all_sovereigns_protected,
      drift_detected:       assurance.continuous_governance_validation.drift_detected
    },
    certification_assurance_summary: {
      org_compliant:    certDrift.org_compliance.compliant,
      org_total:        certDrift.org_compliance.total,
      phase_compliant:  certDrift.phase_compliance.compliant,
      phase_total:      certDrift.phase_compliance.total,
      drift_detected:   certDrift.certification_drift_detected
    },
    operational_assurance_summary: {
      risk_score:        risk.risk_score,
      risk_level:        risk.risk_level,
      risk_trend:        risk.risk_trend,
      health_status:     risk.operational_risk.health_status,
      processing_cycles: stability.processing_cycles,
      failed_cycles:     stability.failed_cycles
    },
    compliance_assurance_summary: {
      overall_score:          compliance.overall_compliance_score,
      workflow_compliance:    compliance.workflow_compliance,
      governance_compliance:  compliance.governance_compliance,
      tenant_compliance:      compliance.tenant_compliance,
      maturity_score:         governance.governance_maturity_score
    },
    longitudinal_analysis_summary: {
      trend_evolution:   analytics.trend_evolution.direction,
      throughput_30d:    analytics.throughput['30d'],
      throughput_90d:    analytics.throughput['90d'],
      compliance_30d:      analytics.compliance['30d'],
      compliance_90d:      analytics.compliance['90d'],
      operational_trends: analytics.trend_evolution.operational
    },
    enterprise_assurance_recommendation: {
      recommendation,
      continuous_readiness: readiness.continuous_readiness,
      pass_count:           readiness.pass_count,
      total_checks:         readiness.total_checks,
      prerequisites: {
        certification_intact:   !certDrift.certification_drift_detected,
        scalability_validated:  scalability.validated,
        runtime_cognitive:      false,
        governance_assured:     assurance.governance_assurance_score >= 70
      }
    },
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateEnterpriseAssuranceReport,
  LAYER
};
