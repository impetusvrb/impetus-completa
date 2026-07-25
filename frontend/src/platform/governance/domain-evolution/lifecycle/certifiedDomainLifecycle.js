/**
 * DOMAIN-GOV-001 — Lifecycle for certified domains.
 */
export const CERTIFIED_DOMAIN_LIFECYCLE = Object.freeze([
  Object.freeze({
    id: 'discovery',
    order: 1,
    entry: 'business problem or domain gap registered',
    exit: 'evidence, owners and existing capabilities identified',
    requiredArtifacts: Object.freeze(['discovery_inventory', 'problem_evidence'])
  }),
  Object.freeze({
    id: 'planning',
    order: 2,
    entry: 'discovery accepted',
    exit: 'business case, reuse checklist and architecture assessment approved',
    requiredArtifacts: Object.freeze([
      'business_case',
      'capability_reuse_checklist',
      'architecture_impact_assessment'
    ])
  }),
  Object.freeze({
    id: 'implementation',
    order: 3,
    entry: 'program formally authorized',
    exit: 'scoped implementation complete with evidence',
    requiredArtifacts: Object.freeze(['approved_scope', 'implementation_evidence'])
  }),
  Object.freeze({
    id: 'validation',
    order: 4,
    entry: 'implementation complete',
    exit: 'acceptance, regression, observability and resilience gates pass',
    requiredArtifacts: Object.freeze(['validation_report', 'regression_report'])
  }),
  Object.freeze({
    id: 'certification',
    order: 5,
    entry: 'validation gate passed',
    exit: 'certificate and baseline impact verdict published',
    requiredArtifacts: Object.freeze(['certificate', 'executive_baseline'])
  }),
  Object.freeze({
    id: 'business_evolution',
    order: 6,
    entry: 'domain certified and business demand evidenced',
    exit: 'new proposal approved or rejected by DOMAIN-GOV-001',
    requiredArtifacts: Object.freeze([
      'business_case',
      'reuse_evidence',
      'certificate_impact_assessment'
    ])
  })
]);

export const CERTIFIED_DOMAIN_LIFECYCLE_FLOW = Object.freeze([
  'discovery',
  'planning',
  'implementation',
  'validation',
  'certification',
  'business_evolution'
]);

export function getDomainLifecycleStage(id) {
  return CERTIFIED_DOMAIN_LIFECYCLE.find((stage) => stage.id === id) || null;
}

export function mayTransitionDomainLifecycle(from, to, evidence = []) {
  const fromStage = getDomainLifecycleStage(from);
  const toStage = getDomainLifecycleStage(to);
  if (!fromStage || !toStage) {
    return Object.freeze({ allowed: false, missing: Object.freeze(['invalid_stage']) });
  }
  const sequential = toStage.order === fromStage.order + 1;
  const businessLoop =
    from === 'business_evolution' && ['planning', 'validation', 'certification'].includes(to);
  const missing = fromStage.requiredArtifacts.filter((artifact) => !evidence.includes(artifact));
  return Object.freeze({
    allowed: (sequential || businessLoop) && missing.length === 0,
    missing: Object.freeze(missing),
    transition: `${from}→${to}`
  });
}

export function validateCertifiedDomainLifecycle() {
  const issues = [];
  if (CERTIFIED_DOMAIN_LIFECYCLE.length !== 6) issues.push('lifecycle must contain six stages');
  const ids = CERTIFIED_DOMAIN_LIFECYCLE.map((stage) => stage.id);
  if (JSON.stringify(ids) !== JSON.stringify(CERTIFIED_DOMAIN_LIFECYCLE_FLOW)) {
    issues.push('lifecycle order mismatch');
  }
  for (const stage of CERTIFIED_DOMAIN_LIFECYCLE) {
    if (!stage.entry || !stage.exit || !stage.requiredArtifacts.length) {
      issues.push(`${stage.id}: incomplete criteria`);
    }
  }
  return { valid: issues.length === 0, issues };
}

