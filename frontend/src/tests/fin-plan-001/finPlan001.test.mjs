/**
 * FIN-PLAN-001 — Capability Release Planning tests (read-only).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIN_PLAN_001_PHASE,
  FIN_PLAN_001_PRINCIPLE,
  FIN_PLAN_001_SCOPE,
  FIN_PLAN_001_PROGRAM_SEQUENCE,
  financePlanningApi,
  validateFinPlan001Integrity,
  listFinanceReleases,
  getFinanceRelease,
  getBusinessDecisionsForRelease,
  getReleaseDependencies
} from '../../platform/planning/finance-release/index.js';
import { FIN_CONCEPT_001_CAPABILITIES } from '../../platform/planning/fin-concept-001/finConcept001AssessmentCatalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const DOCS = path.join(FE, 'docs/evidence/FIN-PLAN-001');

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

console.log('FIN-PLAN-001 — finPlan001.test\n');

test('DELIVER CAPABILITIES, NOT MODULES — planning only', () => {
  assert.equal(FIN_PLAN_001_PHASE, 'FIN-PLAN-001');
  assert.equal(FIN_PLAN_001_PRINCIPLE, 'DELIVER CAPABILITIES, NOT MODULES');
  assert.equal(FIN_PLAN_001_SCOPE.implementsFeatures, false);
  assert.equal(FIN_PLAN_001_SCOPE.modifiesCode, false);
  assert.equal(FIN_PLAN_001_SCOPE.createsModules, false);
  assert.equal(FIN_PLAN_001_SCOPE.planningOnly, true);
});

test('program sequence — PLAN replaces ROADMAP naming', () => {
  const seq = [...FIN_PLAN_001_PROGRAM_SEQUENCE];
  assert.ok(seq.includes('FIN-PLAN-001'));
  assert.ok(!seq.includes('FIN-ROADMAP-001'));
  assert.ok(seq.indexOf('FIN-CONCEPT-001') < seq.indexOf('FIN-PLAN-001'));
  assert.ok(seq.indexOf('FIN-PLAN-001') < seq.indexOf('FIN-EVOLVE-002'));
});

test('four active releases 2.0–2.3 + backlog', () => {
  const releases = listFinanceReleases();
  assert.deepEqual(
    releases.map((r) => r.releaseId),
    ['2.0', '2.1', '2.2', '2.3']
  );
  const backlog = getFinanceRelease('backlog');
  assert.equal(backlog.backlog, true);
  assert.ok(backlog.capabilities.some((c) => c.id === 'capex_opex_investment'));
});

test('all FIN-CONCEPT capabilities assigned exactly once', () => {
  const v = financePlanningApi.validate();
  assert.equal(v.valid, true, v.issues.join('; '));
  assert.equal(FIN_CONCEPT_001_CAPABILITIES.length, 12);
});

test('release 2.0 is immediate reuse — no new modules', () => {
  const r = getFinanceRelease('2.0');
  assert.equal(r.allowsNewModules, false);
  assert.ok(r.capabilities.every((c) => c.isNewModule === false));
  const ids = r.capabilities.map((c) => c.id);
  assert.ok(ids.includes('role_based_dashboards'));
  assert.ok(ids.includes('executive_financial_kpis'));
  assert.ok(ids.includes('smart_financial_alerts'));
});

test('release 2.2 forbids parallel simulator', () => {
  const dep = getReleaseDependencies('2.2');
  assert.ok(dep.forbidden.includes('new_financial_simulator'));
  assert.ok(getFinanceRelease('2.2').capabilities.some((c) => c.id === 'financial_digital_twin'));
});

test('business decisions matrix per release', () => {
  for (const id of ['2.0', '2.1', '2.2', '2.3']) {
    const row = getBusinessDecisionsForRelease(id);
    assert.ok(row, id);
    assert.ok(row.decisionsEnabled.length >= 1, id);
  }
});

test('readiness criteria present', () => {
  const r = getFinanceRelease('2.0').readiness;
  assert.equal(r.reuseConfirmed, true);
  assert.equal(r.baselineImpactAssessed, true);
});

test('integrity API', () => {
  const r = validateFinPlan001Integrity();
  assert.equal(r.valid, true, r.issues.join('; '));
});

test('documentation deliverables', () => {
  const docs = [
    'FIN-PLAN-001-CAPABILITY-PACKAGES.md',
    'FIN-PLAN-001-RELEASE-2.0.md',
    'FIN-PLAN-001-RELEASE-2.1.md',
    'FIN-PLAN-001-RELEASE-2.2.md',
    'FIN-PLAN-001-RELEASE-2.3.md',
    'FIN-PLAN-001-BACKLOG.md',
    'FIN-PLAN-001-DEPENDENCY-MATRIX.md',
    'FIN-PLAN-001-BUSINESS-DECISIONS.md',
    'FIN-PLAN-001-EXECUTIVE-SUMMARY.md'
  ];
  for (const doc of docs) {
    assert.ok(fs.existsSync(path.join(DOCS, doc)), `missing ${doc}`);
  }
});

test('planning modules exist — no product engines under domains/finance', () => {
  const dir = path.join(FE, 'src/platform/planning/finance-release');
  for (const f of [
    'financeCapabilityPackages.js',
    'financeReleaseRoadmap.js',
    'financeBusinessDecisionMatrix.js',
    'financeDependencyMatrix.js',
    'financePlanningApi.js'
  ]) {
    assert.ok(fs.existsSync(path.join(dir, f)), f);
  }
  assert.equal(fs.existsSync(path.join(FE, 'src/domains/finance/engines')), false);
});

console.log(`\nFIN-PLAN-001: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
