'use strict';

/**
 * AIOI-P6.1 — Governance Assurance Service
 *
 * Validação contínua de governança enterprise — READ ONLY.
 * Spec: backend/docs/AIOI_GOVERNANCE_ASSURANCE_SPECIFICATION.md
 */

const enterpriseGovernance = require('./aioiEnterpriseGovernanceService');
const governanceDrift = require('./aioiGovernanceDriftService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const certificationDrift = require('./aioiCertificationDriftService');

const LAYER = 'AIOI_GOVERNANCE_ASSURANCE';

const SOVEREIGN_DOMAINS = [
  { id: 'priority',   sovereign: 'operationalPrioritizationService' },
  { id: 'queue',      sovereign: 'aioi_executive_queue_snapshot' },
  { id: 'learning',   sovereign: 'operationalLearningService' },
  { id: 'execution',  sovereign: 'actionRuntimeOrchestrator' },
  { id: 'truth',      sovereign: 'industrialTruthEnforcementService' },
  { id: 'workflow',   sovereign: 'workflowOrchestrator' }
];

function _computeAssuranceScore({ governance, drift, analytics, certDrift }) {
  let score = governance.governance_maturity_score;
  if (drift.drift_detected) score -= drift.drift_count * 8;
  if (certDrift.certification_drift_detected) score -= certDrift.drift_count * 5;
  score = (score + analytics.overall_compliance_score) / 2;
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Validação contínua de governança e assurance enterprise.
 * @returns {Promise<object>}
 */
async function validateContinuousGovernance() {
  const [governance, drift, analytics, certDrift] = await Promise.all([
    enterpriseGovernance.getGovernanceComplianceSnapshot(),
    Promise.resolve(governanceDrift.detectGovernanceDrift()),
    complianceAnalytics.getComplianceAnalytics(),
    Promise.resolve(certificationDrift.detectCertificationDrift())
  ]);

  const assuranceScore = _computeAssuranceScore({ governance, drift, analytics, certDrift });

  const policyAssurance = {
    policies:           governance.policy_adherence.policies,
    adherence_pct:      governance.policy_adherence.adherence_pct,
    all_policies_met:   governance.policy_adherence.all_policies_met,
    workflow_compliance: analytics.workflow_compliance,
    governance_compliance: analytics.governance_compliance
  };

  const sovereignProtection = SOVEREIGN_DOMAINS.map(s => {
    const domainMap = {
      priority:  null,
      queue:     'Queue Sovereignty',
      learning:  'Learning Governance',
      execution: 'Execution Governance',
      truth:     'Truth Sovereignty',
      workflow:  'Workflow Governance'
    };
    const domainName = domainMap[s.id];
    const domainDrift = domainName
      ? drift.domains.find(d => d.domain === domainName)
      : null;
    return {
      domain:     s.id,
      sovereign:  s.sovereign,
      protected:  domainDrift ? domainDrift.pass : true,
      detail:     domainDrift?.detail || null
    };
  });

  const allSovereignsProtected = sovereignProtection.every(s => s.protected);

  return {
    ok: assuranceScore >= 70 && !drift.drift_detected && allSovereignsProtected,
    layer: LAYER,
    continuous_governance_validation: {
      drift_detected:              drift.drift_detected,
      certification_drift_detected: certDrift.certification_drift_detected,
      maturity_score:              governance.governance_maturity_score,
      compliance_score:            analytics.overall_compliance_score
    },
    governance_assurance_score: assuranceScore,
    policy_assurance:           policyAssurance,
    sovereign_protection_verification: {
      domains:              sovereignProtection,
      all_sovereigns_protected: allSovereignsProtected
    },
    enterprise_assurance_summary: {
      assurance_score:      assuranceScore,
      policy_adherence_pct: governance.policy_adherence.adherence_pct,
      drift_count:          drift.drift_count + certDrift.drift_count,
      tenant_posture_count: governance.tenant_governance_posture.length,
      runtime_cognitive:    false
    },
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateContinuousGovernance,
  LAYER
};
