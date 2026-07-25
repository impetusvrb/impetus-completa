/**
 * DOMAIN-GOV-001 — Applicability map only.
 * Does not change certification status or implementation of any domain.
 */
export const DOMAIN_GOVERNANCE_APPLICABILITY = Object.freeze([
  Object.freeze({
    domain: 'finance',
    referenceCertificate: 'CERT-FINANCE-DOMAIN-001',
    applicability: 'REFERENCE_IMPLEMENTATION',
    implementationChanged: false
  }),
  Object.freeze({
    domain: 'logistics',
    referenceCertificate: null,
    applicability: 'POLICY_APPLICABLE_ON_NEXT_EVOLUTION',
    implementationChanged: false
  }),
  Object.freeze({
    domain: 'quality',
    referenceCertificate: null,
    applicability: 'POLICY_APPLICABLE_ON_NEXT_EVOLUTION',
    implementationChanged: false
  }),
  Object.freeze({
    domain: 'safety',
    referenceCertificate: null,
    applicability: 'POLICY_APPLICABLE_ON_NEXT_EVOLUTION',
    implementationChanged: false
  }),
  Object.freeze({
    domain: 'environment',
    referenceCertificate: null,
    applicability: 'POLICY_APPLICABLE_ON_NEXT_EVOLUTION',
    implementationChanged: false
  }),
  Object.freeze({
    domain: 'maintenance',
    referenceCertificate: null,
    applicability: 'POLICY_APPLICABLE_ON_NEXT_EVOLUTION',
    implementationChanged: false
  }),
  Object.freeze({
    domain: 'production',
    referenceCertificate: null,
    applicability: 'POLICY_APPLICABLE_ON_NEXT_EVOLUTION',
    implementationChanged: false
  })
]);

export const CROSS_DOMAIN_APPLICATION_RULES = Object.freeze([
  'preserve_each_domain_owner_and_certificate',
  'apply_policy_without_automatic_activation',
  'reuse_platform_and_owner_domain_capabilities_first',
  'adapt_business_metrics_without_forking_governance',
  'require_local_validation_and_certificate_impact_verdict'
]);

export function validateCrossDomainApplicability() {
  const issues = [];
  const domains = new Set();
  for (const item of DOMAIN_GOVERNANCE_APPLICABILITY) {
    if (domains.has(item.domain)) issues.push(`duplicate domain ${item.domain}`);
    domains.add(item.domain);
    if (item.implementationChanged !== false) {
      issues.push(`${item.domain}: governance must not change implementation`);
    }
    if (!item.applicability) issues.push(`${item.domain}: applicability missing`);
  }
  for (const required of ['finance', 'logistics', 'quality', 'safety', 'environment']) {
    if (!domains.has(required)) issues.push(`missing domain ${required}`);
  }
  return { valid: issues.length === 0, issues, domainCount: domains.size };
}

