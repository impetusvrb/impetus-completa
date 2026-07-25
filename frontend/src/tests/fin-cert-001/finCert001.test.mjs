import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  FIN_CERT_001_PHASE,
  FIN_CERT_001_PRINCIPLE,
  FIN_CERT_001_SCOPE,
  FIN_CERT_001_COMPLETED_PROGRAMS,
  FINANCE_CAPABILITY_CATEGORIES,
  FINANCE_DOMAIN_CAPABILITY_INVENTORY,
  validateFinanceDomainCapabilityInventory,
  FINANCE_CERTIFIED_CONTRACTS,
  validateFinanceContractCertification,
  assessFinanceArchitectureConformance,
  FINANCE_OPERATIONAL_READINESS_MATRIX,
  validateFinanceOperationalReadiness,
  FINANCE_RESIDUAL_BACKLOG,
  validateFinanceResidualBacklog,
  FINANCE_DOMAIN_CERTIFICATE,
  getFinanceDomainExecutiveBaseline,
  validateFinCert001
} from '../../platform/certification/finance/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '../../..');
const certificationRoot = path.join(frontend, 'src/platform/certification/finance');
const evidenceRoot = path.join(frontend, 'docs/evidence/FIN-CERT-001');

test('programa certifica o domínio, sem implementar funcionalidades', () => {
  assert.equal(FIN_CERT_001_PHASE, 'FIN-CERT-001');
  assert.equal(FIN_CERT_001_PRINCIPLE, 'CERTIFY THE DOMAIN, NOT THE RELEASE');
  assert.equal(FIN_CERT_001_SCOPE.certificationOnly, true);
  assert.equal(FIN_CERT_001_SCOPE.implementsFeatures, false);
  assert.equal(FIN_CERT_001_SCOPE.altersBusinessLogic, false);
  assert.equal(FIN_CERT_001_SCOPE.altersContracts, false);
  assert.equal(FIN_CERT_001_SCOPE.createsProductComponents, false);
  assert.equal(FIN_CERT_001_COMPLETED_PROGRAMS.includes('FIN-EVOLVE-2.4'), true);
});

test('inventário cobre todas as sete categorias do domínio', () => {
  const validation = validateFinanceDomainCapabilityInventory();
  assert.equal(validation.valid, true, validation.issues.join('; '));
  assert.deepEqual(FINANCE_CAPABILITY_CATEGORIES, [
    'operational',
    'economic_intelligence',
    'digital_twin',
    'what_if',
    'prediction',
    'governance',
    'observability'
  ]);
  assert.equal(FINANCE_DOMAIN_CAPABILITY_INVENTORY.length >= 15, true);
  assert.equal(
    FINANCE_DOMAIN_CAPABILITY_INVENTORY.every((capability) => capability.status === 'CERTIFIED'),
    true
  );
});

test('contratos obrigatórios possuem versão, owner e compatibilidade certificados', () => {
  const validation = validateFinanceContractCertification();
  assert.equal(validation.valid, true, validation.issues.join('; '));
  for (const id of [
    'finance.driver_rate.v1',
    'finance.asset_cost_map.v1',
    'finance.wms_valuation.v1',
    'platform.prediction.public_api.v1'
  ]) {
    const contract = FINANCE_CERTIFIED_CONTRACTS.find((item) => item.id === id);
    assert.ok(contract, id);
    assert.ok(contract.version, id);
    assert.ok(contract.owner, id);
    assert.ok(contract.compatibility, id);
    assert.equal(contract.status, 'CERTIFIED');
  }
});

test('conformidade confirma ausência de motores e lógica paralela', () => {
  const conformance = assessFinanceArchitectureConformance();
  assert.equal(conformance.valid, true, conformance.issues.join('; '));
  assert.equal(conformance.duplicateEngines, false);
  assert.equal(conformance.parallelLogic, false);
  assert.equal(conformance.uncertifiedContracts, false);
  assert.equal(conformance.improperDependencies, false);
  assert.equal(conformance.checks.every((check) => check.pass), true);
});

test('readiness consolida observabilidade, explicabilidade, confidence e integrações', () => {
  const validation = validateFinanceOperationalReadiness();
  assert.equal(validation.valid, true, validation.issues.join('; '));
  assert.equal(FINANCE_OPERATIONAL_READINESS_MATRIX.length, 8);
  assert.equal(FINANCE_OPERATIONAL_READINESS_MATRIX.every((item) => item.status === 'READY'), true);
  assert.equal(validation.checks.hubIntegration, true);
  assert.equal(validation.checks.twinIntegration, true);
  assert.equal(validation.checks.whatIfIntegration, true);
  assert.equal(validation.checks.predictionIntegration, true);
});

test('backlog residual é evolutivo e não bloqueia a certificação', () => {
  const validation = validateFinanceResidualBacklog();
  assert.equal(validation.valid, true, validation.issues.join('; '));
  assert.equal(validation.blocksCertification, false);
  assert.ok(FINANCE_RESIDUAL_BACKLOG.some((item) => item.id === 'GAP-PB-003'));
  assert.equal(FINANCE_RESIDUAL_BACKLOG.every((item) => item.certificationBlocks === false), true);
});

test('baseline executiva única certifica Finance enterprise', () => {
  const result = validateFinCert001();
  assert.equal(result.valid, true, result.issues.join('; '));
  assert.equal(result.assessment.enterpriseCertified, true);
  assert.equal(result.assessment.horizontalRoadmapClosed, true);
  assert.equal(FINANCE_DOMAIN_CERTIFICATE.id, 'CERT-FINANCE-DOMAIN-001');
  const baseline = getFinanceDomainExecutiveBaseline();
  assert.equal(baseline.certification.certified, true);
  assert.equal(baseline.certification.futureEvolutionPolicy, 'business_justified_evolution_preserving_baseline');
});

test('módulo contém apenas certificação e validação read-only', () => {
  const files = fs.readdirSync(certificationRoot).filter((name) => name.endsWith('.js'));
  const content = files
    .map((name) => fs.readFileSync(path.join(certificationRoot, name), 'utf8'))
    .join('\n');
  assert.doesNotMatch(content, /fetch\(|axios|POST|PUT|PATCH|DELETE|localStorage|sessionStorage/);
  assert.doesNotMatch(content, /Math\.random|trainModel|fitModel|createPredictionEngine/i);
  assert.match(content, /CERTIFY THE DOMAIN, NOT THE RELEASE/);
});

test('sete entregáveis documentais existem', () => {
  for (const name of [
    'FIN-CERT-001-CAPABILITIES.md',
    'FIN-CERT-001-CONTRACTS.md',
    'FIN-CERT-001-ARCHITECTURE.md',
    'FIN-CERT-001-READINESS.md',
    'FIN-CERT-001-BACKLOG.md',
    'FIN-CERT-001-BASELINE.md',
    'FIN-CERT-001-EXECUTIVE-SUMMARY.md'
  ]) {
    assert.equal(fs.existsSync(path.join(evidenceRoot, name)), true, name);
  }
});

