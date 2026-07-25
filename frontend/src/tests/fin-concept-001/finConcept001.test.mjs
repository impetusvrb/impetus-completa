/**
 * FIN-CONCEPT-001 — assessment integrity tests (no product implementation).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIN_CONCEPT_001_PHASE,
  FIN_CONCEPT_001_PRINCIPLE,
  FIN_CONCEPT_001_SCOPE,
  FIN_CONCEPT_001_CAPABILITIES,
  FIN_CONCEPT_001_ROADMAP_SEQUENCE,
  ROADMAP_CLASS,
  EXISTENCE,
  STRATEGY,
  buildCapabilityMatrix,
  getCapabilityAssessment,
  listByRoadmapClass,
  validateFinConcept001Integrity
} from '../../platform/planning/fin-concept-001/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const DOCS = path.join(FE, 'docs/evidence/FIN-CONCEPT-001');

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

console.log('FIN-CONCEPT-001 — finConcept001.test\n');

test('ASSESS BEFORE BUILD — no product implementation scope', () => {
  assert.equal(FIN_CONCEPT_001_PHASE, 'FIN-CONCEPT-001');
  assert.equal(FIN_CONCEPT_001_PRINCIPLE, 'ASSESS BEFORE BUILD');
  assert.equal(FIN_CONCEPT_001_SCOPE.implementsFeatures, false);
  assert.equal(FIN_CONCEPT_001_SCOPE.createsModules, false);
  assert.equal(FIN_CONCEPT_001_SCOPE.modifiesArchitecture, false);
});

test('roadmap sequence includes STAB before CONCEPT before PLAN before EVOLVE-002', () => {
  const seq = [...FIN_CONCEPT_001_ROADMAP_SEQUENCE];
  assert.ok(seq.indexOf('FIN-STAB-001') < seq.indexOf('FIN-CONCEPT-001'));
  assert.ok(seq.indexOf('FIN-CONCEPT-001') < seq.indexOf('FIN-PLAN-001'));
  assert.ok(seq.indexOf('FIN-PLAN-001') < seq.indexOf('FIN-EVOLVE-002'));
});

test('capability matrix answers Exists / Partial / Reuse / New module', () => {
  const matrix = buildCapabilityMatrix();
  assert.ok(matrix.length >= 11);
  for (const row of matrix) {
    assert.equal(typeof row.existe, 'boolean');
    assert.equal(typeof row.parcial, 'boolean');
    assert.equal(typeof row.reutiliza, 'boolean');
    assert.equal(typeof row.novoModulo, 'boolean');
    assert.ok(!(row.existe && row.parcial), `${row.ideia}: cannot be both exists and partial`);
  }
});

test('Financial Digital Twin assessed as integrate_then_develop expansion', () => {
  const twin = getCapabilityAssessment('financial_digital_twin');
  assert.ok(twin);
  assert.equal(twin.existence, EXISTENCE.PARTIAL);
  assert.equal(twin.strategy, STRATEGY.INTEGRATE_THEN_DEVELOP);
  assert.equal(twin.roadmapClass, ROADMAP_CLASS.INCREMENTAL_EXPANSION);
  assert.equal(twin.isNewModule, false);
  assert.ok(twin.reusedComponents.some((p) => String(p).toLowerCase().includes('digital')));
});

test('new modules only for truly absent capabilities', () => {
  const news = listByRoadmapClass(ROADMAP_CLASS.NEW_MODULE);
  assert.ok(news.length >= 2);
  for (const n of news) {
    assert.equal(n.existence, EXISTENCE.ABSENT);
    assert.equal(n.isNewModule, true);
  }
  assert.ok(news.some((n) => n.id === 'capex_opex_investment'));
  assert.ok(news.some((n) => n.id === 'managerial_consolidation'));
});

test('P0 items are immediate reuse', () => {
  const p0 = FIN_CONCEPT_001_CAPABILITIES.filter((c) => c.priority === 'P0');
  assert.ok(p0.length >= 3);
  for (const c of p0) {
    assert.equal(c.roadmapClass, ROADMAP_CLASS.IMMEDIATE_REUSE);
    assert.equal(c.isNewModule, false);
  }
});

test('integrity validation', () => {
  const r = validateFinConcept001Integrity();
  assert.equal(r.valid, true, r.issues.join('; '));
});

test('documentation deliverables exist', () => {
  const docs = [
    'FIN-CONCEPT-001-EXECUTIVE-SUMMARY.md',
    'FIN-CONCEPT-001-CAPABILITY-MATRIX.md',
    'FIN-CONCEPT-001-CAPABILITY-CARDS.md',
    'FIN-CONCEPT-001-DIGITAL-TWIN-OPPORTUNITY.md',
    'FIN-CONCEPT-001-ROADMAP.md',
    'FIN-CONCEPT-001-REUSE-MAP.md'
  ];
  for (const doc of docs) {
    assert.ok(fs.existsSync(path.join(DOCS, doc)), `missing ${doc}`);
  }
});

test('no Finance product engines created under domains/finance for this phase', () => {
  const conceptProduct = path.join(FE, 'src/domains/finance/concept');
  assert.equal(fs.existsSync(conceptProduct), false);
});

console.log(`\nFIN-CONCEPT-001: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
