/**
 * DOMAIN-GOV-001 — Read-only governance API and integrity validation.
 */
import {
  DOMAIN_GOV_001_PHASE,
  DOMAIN_GOV_001_PRINCIPLE,
  DOMAIN_GOV_001_SCOPE,
  DOMAIN_GOV_001_BASELINES
} from './domainEvolutionConstants.js';
import {
  DOMAIN_EVOLUTION_POLICY,
  validateDomainEvolutionPolicy
} from './policy/domainEvolutionPolicy.js';
import {
  DOMAIN_EVOLUTION_BUSINESS_CASE_TEMPLATE,
  validateBusinessCaseTemplate
} from './templates/businessCaseTemplate.js';
import {
  ARCHITECTURE_IMPACT_QUESTIONS,
  validateArchitectureImpactAssessment
} from './assessment/architectureImpactAssessment.js';
import {
  CAPABILITY_REUSE_CHECKLIST,
  validateCapabilityReuseChecklist
} from './checklists/capabilityReuseChecklist.js';
import {
  CERTIFIED_DOMAIN_LIFECYCLE,
  validateCertifiedDomainLifecycle
} from './lifecycle/certifiedDomainLifecycle.js';
import {
  DOMAIN_GOVERNANCE_APPLICABILITY,
  validateCrossDomainApplicability
} from './policy/crossDomainApplicability.js';
import { validatePlatformGovernance } from '../../release/platformRelease2026Governance.js';

export function getDomainEvolutionGovernance() {
  return Object.freeze({
    phase: DOMAIN_GOV_001_PHASE,
    principle: DOMAIN_GOV_001_PRINCIPLE,
    scope: DOMAIN_GOV_001_SCOPE,
    baselines: DOMAIN_GOV_001_BASELINES,
    policy: DOMAIN_EVOLUTION_POLICY,
    businessCaseTemplate: DOMAIN_EVOLUTION_BUSINESS_CASE_TEMPLATE,
    architectureAssessment: ARCHITECTURE_IMPACT_QUESTIONS,
    reuseChecklist: CAPABILITY_REUSE_CHECKLIST,
    lifecycle: CERTIFIED_DOMAIN_LIFECYCLE,
    crossDomainApplicability: DOMAIN_GOVERNANCE_APPLICABILITY,
    changesCertifiedDomains: false,
    changesContracts: false,
    createsRuntime: false,
    createsEngine: false
  });
}

export function validateDomainGov001() {
  const parts = Object.freeze({
    platformGovernance: validatePlatformGovernance(),
    policy: validateDomainEvolutionPolicy(),
    businessCaseTemplate: validateBusinessCaseTemplate(),
    architectureAssessment: validateArchitectureImpactAssessment(),
    reuseChecklist: validateCapabilityReuseChecklist(),
    lifecycle: validateCertifiedDomainLifecycle(),
    crossDomain: validateCrossDomainApplicability()
  });
  const governance = getDomainEvolutionGovernance();
  const issues = [
    ...Object.values(parts).flatMap((part) => part.issues || []),
    ...(DOMAIN_GOV_001_SCOPE.implementsFeatures ? ['governance must not implement features'] : []),
    ...(DOMAIN_GOV_001_SCOPE.altersCertifiedDomains ? ['certified domains must remain unchanged'] : []),
    ...(governance.changesContracts ? ['contracts must remain unchanged'] : []),
    ...(governance.createsRuntime || governance.createsEngine
      ? ['governance must not create runtime or engine']
      : [])
  ];
  return {
    valid: Object.values(parts).every((part) => part.valid) && issues.length === 0,
    issues,
    phase: DOMAIN_GOV_001_PHASE,
    principle: DOMAIN_GOV_001_PRINCIPLE,
    governance,
    parts
  };
}

