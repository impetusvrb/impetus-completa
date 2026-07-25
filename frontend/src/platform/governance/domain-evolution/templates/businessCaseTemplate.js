/**
 * DOMAIN-GOV-001 — Standard business case schema for certified domains.
 */
export const DOMAIN_EVOLUTION_BUSINESS_CASE_TEMPLATE = Object.freeze({
  id: 'platform.domain_evolution_business_case.v1',
  requiredFields: Object.freeze([
    'proposalId',
    'certifiedDomain',
    'businessProblem',
    'objectives',
    'expectedBenefits',
    'stakeholders',
    'accountableOwner',
    'existingCapabilitiesReused',
    'architectureImpacts',
    'risks',
    'successCriteria'
  ]),
  sections: Object.freeze([
    Object.freeze({
      id: 'business_problem',
      prompt: 'Qual problema de negócio observável precisa ser resolvido?',
      evidenceRequired: true
    }),
    Object.freeze({
      id: 'objectives_and_benefits',
      prompt: 'Quais objetivos e benefícios mensuráveis são esperados?',
      evidenceRequired: true
    }),
    Object.freeze({
      id: 'stakeholders',
      prompt: 'Quem patrocina, utiliza, opera e responde pelo resultado?',
      evidenceRequired: false
    }),
    Object.freeze({
      id: 'baseline_reuse',
      prompt: 'Quais capacidades, contratos, serviços e adapters existentes serão reutilizados?',
      evidenceRequired: true
    }),
    Object.freeze({
      id: 'architecture_impact',
      prompt: 'Quais impactos existem sobre contratos, engines, runtimes, owners e certificados?',
      evidenceRequired: true
    }),
    Object.freeze({
      id: 'risks',
      prompt: 'Quais riscos, mitigações, rollback e critérios de interrupção existem?',
      evidenceRequired: true
    }),
    Object.freeze({
      id: 'success',
      prompt: 'Como o valor entregue será medido e validado?',
      evidenceRequired: true
    })
  ]),
  disallowedRationale: Object.freeze([
    'adopt_new_technology',
    'modernize_without_business_outcome',
    'duplicate_for_local_autonomy',
    'complete_technical_roadmap'
  ])
});

function hasContent(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return typeof value === 'string' ? value.trim().length > 0 : value != null;
}

export function validateDomainEvolutionBusinessCase(proposal = {}) {
  const missing = DOMAIN_EVOLUTION_BUSINESS_CASE_TEMPLATE.requiredFields.filter(
    (field) => !hasContent(proposal[field])
  );
  const forbiddenRationale = DOMAIN_EVOLUTION_BUSINESS_CASE_TEMPLATE.disallowedRationale.includes(
    proposal.primaryRationale
  );
  const measurableSuccess =
    Array.isArray(proposal.successCriteria) &&
    proposal.successCriteria.length > 0 &&
    proposal.successCriteria.every((criterion) => hasContent(criterion.metric) && hasContent(criterion.target));
  const issues = [
    ...missing.map((field) => `missing ${field}`),
    ...(forbiddenRationale ? ['technical-only rationale is forbidden'] : []),
    ...(!measurableSuccess ? ['success criteria must contain metric and target'] : [])
  ];

  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
    missing: Object.freeze(missing),
    businessJustified: issues.length === 0
  });
}

export function validateBusinessCaseTemplate() {
  const issues = [];
  if (DOMAIN_EVOLUTION_BUSINESS_CASE_TEMPLATE.requiredFields.length < 11) {
    issues.push('required business case fields incomplete');
  }
  if (DOMAIN_EVOLUTION_BUSINESS_CASE_TEMPLATE.sections.length < 7) {
    issues.push('business case sections incomplete');
  }
  return { valid: issues.length === 0, issues };
}

