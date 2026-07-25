import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DOMAIN_GOV_001_PHASE,
  DOMAIN_GOV_001_PRINCIPLE,
  DOMAIN_GOV_001_SCOPE,
  DOMAIN_EVOLUTION_DECISIONS,
  DOMAIN_EVOLUTION_POLICY,
  evaluateDomainEvolutionPolicy,
  validateDomainEvolutionPolicy,
  validateDomainEvolutionBusinessCase,
  validateBusinessCaseTemplate,
  assessDomainArchitectureImpact,
  validateArchitectureImpactAssessment,
  CAPABILITY_REUSE_CHECKLIST,
  evaluateCapabilityReuseChecklist,
  validateCapabilityReuseChecklist,
  CERTIFIED_DOMAIN_LIFECYCLE_FLOW,
  mayTransitionDomainLifecycle,
  validateCertifiedDomainLifecycle,
  DOMAIN_GOVERNANCE_APPLICABILITY,
  validateCrossDomainApplicability,
  getDomainEvolutionGovernance,
  validateDomainGov001
} from '../../platform/governance/domain-evolution/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '../../..');
const moduleRoot = path.join(frontend, 'src/platform/governance/domain-evolution');
const evidenceRoot = path.join(frontend, 'docs/evidence/DOMAIN-GOV-001');

const validArchitectureAnswers = Object.freeze({
  altersContracts: false,
  createsEngine: false,
  createsRuntime: false,
  reusesCapabilities: true,
  adapterPossible: true,
  duplicatesCapability: false,
  changesOwnership: false,
  affectsCertifiedComponent: false,
  requiresRecertification: false
});

test('programa é exclusivamente governança', () => {
  assert.equal(DOMAIN_GOV_001_PHASE, 'DOMAIN-GOV-001');
  assert.equal(DOMAIN_GOV_001_PRINCIPLE, 'BUSINESS JUSTIFIES EVOLUTION');
  assert.equal(DOMAIN_GOV_001_SCOPE.governanceOnly, true);
  assert.equal(DOMAIN_GOV_001_SCOPE.implementsFeatures, false);
  assert.equal(DOMAIN_GOV_001_SCOPE.altersCertifiedDomains, false);
  assert.equal(DOMAIN_GOV_001_SCOPE.altersPublicContracts, false);
  assert.equal(DOMAIN_GOV_001_SCOPE.createsEngines, false);
  assert.equal(DOMAIN_GOV_001_SCOPE.createsRuntimes, false);
});

test('política exige negócio, reutilização, arquitetura e aprovações', () => {
  assert.equal(validateDomainEvolutionPolicy().valid, true);
  assert.equal(DOMAIN_EVOLUTION_POLICY.openNewProgramWhen.length, 8);
  const architecture = assessDomainArchitectureImpact(validArchitectureAnswers);
  const approved = evaluateDomainEvolutionPolicy({
    businessCaseValid: true,
    reuseChecklistValid: true,
    architectureAssessment: architecture,
    approvals: ['business_sponsor', 'domain_owner', 'platform_architecture']
  });
  assert.equal(approved.decision, DOMAIN_EVOLUTION_DECISIONS.APPROVE);
  assert.equal(approved.mayOpenProgram, true);
  const hold = evaluateDomainEvolutionPolicy();
  assert.equal(hold.decision, DOMAIN_EVOLUTION_DECISIONS.HOLD);
  assert.equal(hold.mayOpenProgram, false);
});

test('template valida Business Case mensurável e rejeita motivação técnica', () => {
  assert.equal(validateBusinessCaseTemplate().valid, true);
  const valid = validateDomainEvolutionBusinessCase({
    proposalId: 'PROP-001',
    certifiedDomain: 'finance',
    businessProblem: 'Tempo excessivo para consolidar custos',
    objectives: ['reduzir lead time'],
    expectedBenefits: ['fecho mais rápido'],
    stakeholders: ['CFO'],
    accountableOwner: 'Finance Owner',
    existingCapabilitiesReused: ['Economic Intelligence Engine'],
    architectureImpacts: { contracts: false },
    risks: ['qualidade de origem'],
    successCriteria: [{ metric: 'lead_time_hours', target: 4 }]
  });
  assert.equal(valid.valid, true, valid.issues.join('; '));
  const invalid = validateDomainEvolutionBusinessCase({
    primaryRationale: 'adopt_new_technology',
    successCriteria: []
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.issues.includes('technical-only rationale is forbidden'));
});

test('assessment rejeita duplicação e exige recertificação estrutural', () => {
  assert.equal(validateArchitectureImpactAssessment().valid, true);
  const duplicate = assessDomainArchitectureImpact({
    ...validArchitectureAnswers,
    duplicatesCapability: true
  });
  assert.equal(duplicate.valid, false);
  assert.equal(duplicate.verdict, 'REJECT_DUPLICATION');
  const structural = assessDomainArchitectureImpact({
    ...validArchitectureAnswers,
    altersContracts: true,
    requiresRecertification: true
  });
  assert.equal(structural.valid, true);
  assert.equal(structural.verdict, 'REQUIRE_RECERTIFICATION');
  assert.equal(structural.requiresRecertification, true);
});

test('checklist de reutilização exige pesquisa, caminho e evidência', () => {
  assert.equal(validateCapabilityReuseChecklist().valid, true);
  assert.equal(CAPABILITY_REUSE_CHECKLIST.length, 9);
  const answers = Object.fromEntries(CAPABILITY_REUSE_CHECKLIST.map((item) => [item.id, true]));
  const result = evaluateCapabilityReuseChecklist({
    answers,
    selectedReusePath: 'adapter',
    evidence: ['registry:platform.prediction']
  });
  assert.equal(result.valid, true, result.issues.join('; '));
  const noEvidence = evaluateCapabilityReuseChecklist({ answers, selectedReusePath: 'adapter' });
  assert.equal(noEvidence.valid, false);
});

test('lifecycle contém seis etapas e gates de transição', () => {
  assert.equal(validateCertifiedDomainLifecycle().valid, true);
  assert.deepEqual(CERTIFIED_DOMAIN_LIFECYCLE_FLOW, [
    'discovery',
    'planning',
    'implementation',
    'validation',
    'certification',
    'business_evolution'
  ]);
  const transition = mayTransitionDomainLifecycle('discovery', 'planning', [
    'discovery_inventory',
    'problem_evidence'
  ]);
  assert.equal(transition.allowed, true);
  assert.equal(mayTransitionDomainLifecycle('planning', 'implementation', []).allowed, false);
});

test('aplicabilidade cross-domain não altera implementações', () => {
  const validation = validateCrossDomainApplicability();
  assert.equal(validation.valid, true, validation.issues.join('; '));
  assert.equal(DOMAIN_GOVERNANCE_APPLICABILITY.length >= 5, true);
  assert.equal(
    DOMAIN_GOVERNANCE_APPLICABILITY.every((item) => item.implementationChanged === false),
    true
  );
  assert.equal(
    DOMAIN_GOVERNANCE_APPLICABILITY.find((item) => item.domain === 'finance')?.referenceCertificate,
    'CERT-FINANCE-DOMAIN-001'
  );
});

test('API consolidada preserva PLATFORM-2026.1 e domínios certificados', () => {
  const validation = validateDomainGov001();
  assert.equal(validation.valid, true, validation.issues.join('; '));
  const governance = getDomainEvolutionGovernance();
  assert.equal(governance.changesCertifiedDomains, false);
  assert.equal(governance.changesContracts, false);
  assert.equal(governance.createsRuntime, false);
  assert.equal(governance.createsEngine, false);
  assert.ok(governance.baselines.includes('PLATFORM-2026.1'));
  assert.ok(governance.baselines.includes('CERT-FINANCE-DOMAIN-001'));
});

test('módulo não importa domínios nem contém implementação de produto', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name.endsWith('.js')) files.push(absolute);
    }
  };
  walk(moduleRoot);
  const content = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(content, /from ['"][^'"]*domains\//);
  assert.doesNotMatch(content, /fetch\(|axios|POST|PUT|PATCH|DELETE|localStorage|sessionStorage/);
  assert.doesNotMatch(content, /createEngine|createRuntime|trainModel|Math\.random/i);
  assert.match(content, /BUSINESS JUSTIFIES EVOLUTION/);
});

test('sete documentos obrigatórios existem', () => {
  for (const name of [
    'DOMAIN-GOV-001-POLICY.md',
    'DOMAIN-GOV-001-BUSINESS-CASE-TEMPLATE.md',
    'DOMAIN-GOV-001-ARCHITECTURE-ASSESSMENT.md',
    'DOMAIN-GOV-001-REUSE-CHECKLIST.md',
    'DOMAIN-GOV-001-LIFECYCLE.md',
    'DOMAIN-GOV-001-CROSS-DOMAIN.md',
    'DOMAIN-GOV-001-EXECUTIVE-SUMMARY.md'
  ]) {
    assert.equal(fs.existsSync(path.join(evidenceRoot, name)), true, name);
  }
});

