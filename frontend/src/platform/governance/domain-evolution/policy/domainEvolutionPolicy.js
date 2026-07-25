/**
 * DOMAIN-GOV-001 — Official policy for evolution of certified domains.
 */
import {
  DOMAIN_GOV_001_PHASE,
  DOMAIN_GOV_001_PRINCIPLE,
  DOMAIN_EVOLUTION_DECISIONS
} from '../domainEvolutionConstants.js';

export const DOMAIN_EVOLUTION_POLICY = Object.freeze({
  id: 'platform.certified_domain_evolution_policy.v1',
  phase: DOMAIN_GOV_001_PHASE,
  principle: DOMAIN_GOV_001_PRINCIPLE,
  appliesTo: 'all_certified_domains',
  firstCertifiedDomain: 'CERT-FINANCE-DOMAIN-001',
  openNewProgramWhen: Object.freeze([
    'business_problem_is_evidenced',
    'expected_value_and_success_metrics_are_declared',
    'stakeholders_and_accountable_owner_are_identified',
    'certified_baseline_reuse_is_demonstrated',
    'capability_reuse_checklist_is_complete',
    'architecture_impact_is_assessed',
    'risks_and_mitigation_are_documented',
    'approval_workflow_is_complete'
  ]),
  minimumCriteria: Object.freeze([
    'business_value',
    'expected_impact',
    'baseline_reuse',
    'no_architectural_duplication',
    'measurable_success',
    'operational_owner',
    'rollback_or_exit_plan'
  ]),
  responsibleRoles: Object.freeze([
    Object.freeze({ role: 'business_sponsor', responsibility: 'Own value, priority and outcome' }),
    Object.freeze({ role: 'domain_owner', responsibility: 'Protect certified domain baseline' }),
    Object.freeze({ role: 'platform_architecture', responsibility: 'Assess reuse and cross-domain impact' }),
    Object.freeze({ role: 'contract_owner', responsibility: 'Approve contract impact when applicable' }),
    Object.freeze({ role: 'security_governance', responsibility: 'Assess security/RBAC impact' }),
    Object.freeze({ role: 'certification_authority', responsibility: 'Set validation and recertification scope' })
  ]),
  approvalProcess: Object.freeze([
    'business_case_submitted',
    'capability_reuse_reviewed',
    'architecture_impact_assessed',
    'owners_approve',
    'program_scope_authorized',
    'implementation_and_validation',
    'certification_or_baseline_update'
  ]),
  certificationRequirements: Object.freeze([
    'regression_against_current_domain_certificate',
    'contract_compatibility_validation',
    'observability_and_evidence',
    'architecture_conformance',
    'business_success_criteria',
    'formal_certificate_impact_verdict'
  ]),
  forbiddenMotivations: Object.freeze([
    'technical_opportunity_only',
    'technology_demo',
    'duplicate_existing_capability',
    'local_reimplementation_of_platform_service',
    'roadmap_completion_without_business_problem'
  ])
});

export function evaluateDomainEvolutionPolicy({
  businessCaseValid = false,
  reuseChecklistValid = false,
  architectureAssessment = {},
  approvals = []
} = {}) {
  const requiredApprovals = ['business_sponsor', 'domain_owner', 'platform_architecture'];
  const approvalsComplete = requiredApprovals.every((role) => approvals.includes(role));
  const duplicatesCapability = architectureAssessment.duplicatesCapability === true;
  const altersBaseline =
    architectureAssessment.altersContracts === true ||
    architectureAssessment.createsEngine === true ||
    architectureAssessment.createsRuntime === true;

  let decision = DOMAIN_EVOLUTION_DECISIONS.HOLD;
  if (duplicatesCapability) {
    decision = DOMAIN_EVOLUTION_DECISIONS.REJECT_DUPLICATION;
  } else if (businessCaseValid && reuseChecklistValid && architectureAssessment.valid && approvalsComplete) {
    decision = altersBaseline
      ? DOMAIN_EVOLUTION_DECISIONS.REQUIRE_RECERTIFICATION
      : DOMAIN_EVOLUTION_DECISIONS.APPROVE;
  }

  return Object.freeze({
    decision,
    mayOpenProgram:
      decision === DOMAIN_EVOLUTION_DECISIONS.APPROVE ||
      decision === DOMAIN_EVOLUTION_DECISIONS.REQUIRE_RECERTIFICATION,
    recertificationRequired: decision === DOMAIN_EVOLUTION_DECISIONS.REQUIRE_RECERTIFICATION,
    approvalsComplete,
    reasons: Object.freeze([
      ...(!businessCaseValid ? ['business_case_incomplete'] : []),
      ...(!reuseChecklistValid ? ['reuse_checklist_incomplete'] : []),
      ...(!architectureAssessment.valid ? ['architecture_assessment_incomplete'] : []),
      ...(!approvalsComplete ? ['mandatory_approvals_incomplete'] : []),
      ...(duplicatesCapability ? ['architectural_duplication_detected'] : [])
    ])
  });
}

export function validateDomainEvolutionPolicy() {
  const issues = [];
  if (DOMAIN_EVOLUTION_POLICY.principle !== DOMAIN_GOV_001_PRINCIPLE) {
    issues.push('wrong governance principle');
  }
  if (DOMAIN_EVOLUTION_POLICY.openNewProgramWhen.length < 8) issues.push('opening criteria incomplete');
  if (DOMAIN_EVOLUTION_POLICY.responsibleRoles.length < 6) issues.push('responsibilities incomplete');
  if (DOMAIN_EVOLUTION_POLICY.approvalProcess.length < 7) issues.push('approval process incomplete');
  if (!DOMAIN_EVOLUTION_POLICY.forbiddenMotivations.includes('technical_opportunity_only')) {
    issues.push('technical opportunity must not justify evolution');
  }
  return { valid: issues.length === 0, issues };
}

