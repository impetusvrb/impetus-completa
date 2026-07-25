/**
 * FIN-EVOLVE-001 — Phase A integration tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIN_EVOLVE_001_PHASE,
  FIN_EVOLVE_001_STRATEGY,
  FIN_EVOLVE_001_PRINCIPLE,
  FINANCE_CAPABILITY_REGISTRY,
  validateFinanceCapabilityRegistry
} from '../../domains/finance/registry/financeCapabilityRegistry.js';
import { FINANCE_WORKSPACE_INTEGRATIONS } from '../../domains/finance/integration/financeIntegrationLayer.js';
import { validateFinancePublicContracts } from '../../domains/finance/contracts/financePublicContracts.js';
import { canAccessFinanceDomain } from '../../domains/finance/navigation/financeAccess.js';
import { FINANCE_BASE_PATH } from '../../domains/finance/navigation/financeNavigationRegistry.js';
import { EOX_DOMAIN_REGISTRY } from '../../presentation/eox/eoxRegistry.js';
import { DOMAIN_ROUTES } from '../../domains/domainRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const DOCS = path.join(FE, 'docs/evidence/FIN-EVOLVE-001');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

console.log('FIN-EVOLVE-001 — finEvolve001.test\n');

test('INTEGRATE BEFORE DEVELOP — integrate_then_develop', () => {
  assert.equal(FIN_EVOLVE_001_PRINCIPLE, 'INTEGRATE BEFORE DEVELOP');
  assert.equal(FIN_EVOLVE_001_STRATEGY, 'integrate_then_develop');
  assert.equal(FIN_EVOLVE_001_PHASE, 'FIN-EVOLVE-001');
});

test('capability registry reuses FIN-AUD capabilities', () => {
  const ids = FINANCE_CAPABILITY_REGISTRY.map((c) => c.capabilityId);
  assert.ok(ids.includes('industrial_costs'));
  assert.ok(ids.includes('financial_leakage'));
  assert.ok(ids.includes('nexus_billing'));
  assert.ok(FINANCE_CAPABILITY_REGISTRY.length >= 8);
});

test('integration layer — no duplicate engines', () => {
  const snapshot = FINANCE_WORKSPACE_INTEGRATIONS;
  assert.ok(snapshot.some((m) => m.component === 'CentroCustosExecutivo'));
  assert.ok(snapshot.some((m) => m.component === 'MapaVazamentoFinanceiro'));
  assert.ok(snapshot.some((m) => m.component === 'NexusIACustos'));
});

test('EOX finance entry active (FIN-EVOLVE-001)', () => {
  assert.equal(EOX_DOMAIN_REGISTRY.finance.active, true);
  assert.equal(EOX_DOMAIN_REGISTRY.finance.defaultPhase, 'FIN-EVOLVE-001');
});

test('domainRegistry finance entry', () => {
  assert.ok(DOMAIN_ROUTES.finance);
  assert.equal(DOMAIN_ROUTES.finance.routePrefix, FINANCE_BASE_PATH);
});

test('finance access — CEO allowed', () => {
  assert.equal(canAccessFinanceDomain({ role: 'ceo' }), true);
});

test('finance access — finance_management profile', () => {
  assert.equal(canAccessFinanceDomain({ role: 'gerente', dashboard_profile: 'finance_management' }), true);
});

test('integrity validation', () => {
  const cap = validateFinanceCapabilityRegistry();
  const contracts = validateFinancePublicContracts();
  assert.equal(cap.valid, true, cap.issues.join('; '));
  assert.equal(contracts.valid, true, contracts.issues.join('; '));
});

test('domain structure exists', () => {
  for (const dir of ['registry', 'integration', 'contracts', 'navigation', 'observability', 'workspace']) {
    assert.ok(fs.existsSync(path.join(FE, 'src/domains/finance', dir)), dir);
  }
});

test('FIN-EVOLVE-001 documentation deliverables', () => {
  const docs = [
    'FIN-EVOLVE-001-ARCHITECTURE.md',
    'FIN-EVOLVE-001-INTEGRATION.md',
    'FIN-EVOLVE-001-CAPABILITY-MAP.md',
    'FIN-EVOLVE-001-WORKSPACE.md',
    'FIN-EVOLVE-001-CONTRACTS.md',
    'FIN-EVOLVE-001-EXECUTIVE-SUMMARY.md'
  ];
  for (const doc of docs) {
    assert.ok(fs.existsSync(path.join(DOCS, doc)), `missing ${doc}`);
  }
});

console.log(`\nFIN-EVOLVE-001: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
