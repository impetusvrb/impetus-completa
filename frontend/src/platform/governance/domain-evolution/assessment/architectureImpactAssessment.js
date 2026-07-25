/**
 * DOMAIN-GOV-001 — Standard architecture impact assessment.
 */
export const ARCHITECTURE_IMPACT_QUESTIONS = Object.freeze([
  Object.freeze({ id: 'altersContracts', prompt: 'Altera contratos públicos certificados?', required: true }),
  Object.freeze({ id: 'createsEngine', prompt: 'Cria ou duplica um motor?', required: true }),
  Object.freeze({ id: 'createsRuntime', prompt: 'Cria um runtime?', required: true }),
  Object.freeze({ id: 'reusesCapabilities', prompt: 'Reutiliza capacidades existentes?', required: true }),
  Object.freeze({ id: 'adapterPossible', prompt: 'Um adapter sobre capacidade existente é possível?', required: true }),
  Object.freeze({ id: 'duplicatesCapability', prompt: 'Existe capacidade equivalente?', required: true }),
  Object.freeze({ id: 'changesOwnership', prompt: 'Altera ownership de dados ou serviço?', required: true }),
  Object.freeze({ id: 'affectsCertifiedComponent', prompt: 'Afeta componente certificado?', required: true }),
  Object.freeze({ id: 'requiresRecertification', prompt: 'Exige nova certificação?', required: true })
]);

export function assessDomainArchitectureImpact(answers = {}) {
  const missing = ARCHITECTURE_IMPACT_QUESTIONS
    .filter((question) => typeof answers[question.id] !== 'boolean')
    .map((question) => question.id);
  const duplicatesCapability = answers.duplicatesCapability === true;
  const structuralImpact =
    answers.altersContracts === true ||
    answers.createsEngine === true ||
    answers.createsRuntime === true ||
    answers.changesOwnership === true ||
    answers.affectsCertifiedComponent === true;
  const requiresRecertification =
    answers.requiresRecertification === true || structuralImpact;
  const reuseConformant =
    answers.reusesCapabilities === true &&
    (answers.adapterPossible === true || structuralImpact === false);
  const valid = missing.length === 0 && !duplicatesCapability && reuseConformant;

  return Object.freeze({
    valid,
    missing: Object.freeze(missing),
    duplicatesCapability,
    structuralImpact,
    requiresRecertification,
    reuseConformant,
    altersContracts: answers.altersContracts === true,
    createsEngine: answers.createsEngine === true,
    createsRuntime: answers.createsRuntime === true,
    changesOwnership: answers.changesOwnership === true,
    affectsCertifiedComponent: answers.affectsCertifiedComponent === true,
    verdict: duplicatesCapability
      ? 'REJECT_DUPLICATION'
      : missing.length
        ? 'INCOMPLETE'
        : !reuseConformant
          ? 'HOLD_REUSE_REQUIRED'
          : requiresRecertification
            ? 'REQUIRE_RECERTIFICATION'
            : 'CONFORMANT'
  });
}

export function validateArchitectureImpactAssessment() {
  const issues = [];
  const ids = new Set();
  for (const question of ARCHITECTURE_IMPACT_QUESTIONS) {
    if (ids.has(question.id)) issues.push(`duplicate question ${question.id}`);
    ids.add(question.id);
    if (!question.prompt || !question.required) issues.push(`${question.id}: incomplete`);
  }
  for (const required of ['altersContracts', 'createsEngine', 'createsRuntime', 'reusesCapabilities', 'requiresRecertification']) {
    if (!ids.has(required)) issues.push(`missing question ${required}`);
  }
  return { valid: issues.length === 0, issues };
}

