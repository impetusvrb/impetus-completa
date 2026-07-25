/**
 * DOMAIN-GOV-001 — Mandatory capability reuse checklist.
 */
export const CAPABILITY_REUSE_CHECKLIST = Object.freeze([
  Object.freeze({ id: 'equivalentCapabilityChecked', question: 'Existe capacidade equivalente?', required: true }),
  Object.freeze({ id: 'reusableContractChecked', question: 'Existe contrato reutilizável?', required: true }),
  Object.freeze({ id: 'corporateServiceChecked', question: 'Existe serviço corporativo?', required: true }),
  Object.freeze({ id: 'adapterOptionChecked', question: 'Existe adapter possível?', required: true }),
  Object.freeze({ id: 'owningDomainChecked', question: 'Existe domínio proprietário?', required: true }),
  Object.freeze({ id: 'registryChecked', question: 'Registries certificados foram consultados?', required: true }),
  Object.freeze({ id: 'platformCapabilityChecked', question: 'Capacidades horizontais da plataforma foram consultadas?', required: true }),
  Object.freeze({ id: 'securityAndRbacChecked', question: 'RBAC e segurança existentes podem ser reutilizados?', required: true }),
  Object.freeze({ id: 'integrationPathChecked', question: 'Há rota de integração sem alterar a baseline?', required: true })
]);

export const REUSE_PATHS = Object.freeze([
  'existing_capability',
  'existing_contract',
  'corporate_service',
  'adapter',
  'owner_domain_extension',
  'approved_greenfield_exception'
]);

export function evaluateCapabilityReuseChecklist({
  answers = {},
  selectedReusePath = null,
  evidence = [],
  greenfieldExceptionApproved = false
} = {}) {
  const incomplete = CAPABILITY_REUSE_CHECKLIST
    .filter((item) => item.required && answers[item.id] !== true)
    .map((item) => item.id);
  const validPath = REUSE_PATHS.includes(selectedReusePath);
  const unapprovedGreenfield =
    selectedReusePath === 'approved_greenfield_exception' && !greenfieldExceptionApproved;
  const valid =
    incomplete.length === 0 &&
    validPath &&
    evidence.length > 0 &&
    !unapprovedGreenfield;

  return Object.freeze({
    valid,
    incomplete: Object.freeze(incomplete),
    selectedReusePath,
    evidence: Object.freeze([...evidence]),
    greenfieldExceptionApproved,
    issues: Object.freeze([
      ...incomplete.map((id) => `unchecked ${id}`),
      ...(!validPath ? ['reuse path not selected'] : []),
      ...(!evidence.length ? ['reuse evidence required'] : []),
      ...(unapprovedGreenfield ? ['greenfield exception requires explicit approval'] : [])
    ])
  });
}

export function validateCapabilityReuseChecklist() {
  const issues = [];
  if (CAPABILITY_REUSE_CHECKLIST.length < 9) issues.push('reuse checklist incomplete');
  const ids = new Set();
  for (const item of CAPABILITY_REUSE_CHECKLIST) {
    if (ids.has(item.id)) issues.push(`duplicate ${item.id}`);
    ids.add(item.id);
    if (!item.question || !item.required) issues.push(`${item.id}: incomplete`);
  }
  if (!REUSE_PATHS.includes('adapter')) issues.push('adapter reuse path required');
  return { valid: issues.length === 0, issues };
}

