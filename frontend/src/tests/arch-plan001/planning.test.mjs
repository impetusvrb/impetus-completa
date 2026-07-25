/**
 * ARCH-PLAN-001 — Planning integrity + roadmap tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARCH_PLAN_001_PHASE,
  ARCH_PLAN_001_PRINCIPLE,
  getDomainAnalysisReport,
  getDependencyMap,
  getReuseAnalysisReport,
  getConsolidatedGapAnalysis,
  getEvolutionStrategiesReport,
  getCorporateRoadmap,
  getPlanningExecutiveSummary,
  validateArchPlan001Integrity,
  getEvolutionStrategy,
  getRoadmapItem,
  listDomainsByStrategy
} from '../../platform/planning/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const ROADMAP_DOCS = path.join(FE, 'docs/roadmap');

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

console.log('ARCH-PLAN-001 — planning.test\n');

test('PLAN BEFORE BUILD principle', () => {
  assert.equal(ARCH_PLAN_001_PRINCIPLE, 'PLAN BEFORE BUILD');
  assert.equal(ARCH_PLAN_001_PHASE, 'ARCH-PLAN-001');
});

test('planning integrity (ENT-001 baseline required)', () => {
  const result = validateArchPlan001Integrity();
  assert.equal(result.valid, true, result.issues.join('; '));
  assert.equal(result.ent001Valid, true);
});

test('finance strategy is integrate_then_develop — not greenfield', () => {
  const finance = getEvolutionStrategy('finance');
  assert.equal(finance.strategy, 'integrate_then_develop');
  assert.ok(finance.phases.length >= 2);
});

test('logistics_wms is maintenance_only', () => {
  const wms = getEvolutionStrategy('logistics_wms');
  assert.equal(wms.strategy, 'maintenance_only');
});

test('roadmap rank 1 is finance with correct strategy', () => {
  const first = getRoadmapItem(1);
  assert.equal(first.domainId, 'finance');
  assert.equal(first.strategy, 'integrate_then_develop');
  assert.ok(first.expectedReuse.length >= 3);
});

test('every domain has evolution strategy', () => {
  const strategies = getEvolutionStrategiesReport();
  assert.equal(strategies.length, getDomainAnalysisReport().length);
  for (const s of strategies) {
    assert.ok(s.strategyValid, `${s.domainId} invalid strategy`);
  }
});

test('dependency map covers finance blockers', () => {
  const deps = getDependencyMap();
  const finance = deps.find((d) => d.domainId === 'finance');
  assert.ok(finance.blockedBy.length >= 1);
});

test('reuse analysis — finance high reuse', () => {
  const reuse = getReuseAnalysisReport();
  const finance = reuse.find((r) => r.domainId === 'finance');
  assert.ok(finance.reuseEstimatePercent >= 50);
});

test('gap analysis — finance has both exists and develop gaps', () => {
  const gaps = getConsolidatedGapAnalysis();
  const finance = gaps.find((g) => g.domainId === 'finance');
  assert.ok(finance.whatExists.length >= 3);
  assert.ok(finance.whatMustBeDeveloped.length >= 2);
});

test('strategy distribution', () => {
  assert.ok(listDomainsByStrategy('maintenance_only').length >= 7);
  assert.ok(listDomainsByStrategy('recover_then_expand').length >= 4);
  assert.ok(listDomainsByStrategy('greenfield').length >= 2);
});

test('executive summary answers strategy question', () => {
  const summary = getPlanningExecutiveSummary();
  assert.equal(summary.answer.rank1Domain, 'finance');
  assert.equal(summary.answer.rank1Strategy, 'integrate_then_develop');
  assert.ok(summary.answer.strategiesByDomain.integrate_then_develop.includes('finance'));
});

test('corporate roadmap has preservation domains', () => {
  const roadmap = getCorporateRoadmap();
  assert.ok(roadmap.implementationSequence.length >= 8);
  assert.ok(roadmap.preservationDomains.some((d) => d.domainId === 'logistics_wms'));
  assert.equal(roadmap.noNewHorizontalPrograms, true);
});

test('roadmap documentation deliverables exist', () => {
  const docs = [
    'ARCH-PLAN-001-DOMAIN-ANALYSIS.md',
    'ARCH-PLAN-001-DEPENDENCY-MAP.md',
    'ARCH-PLAN-001-REUSE-ANALYSIS.md',
    'ARCH-PLAN-001-EVOLUTION-STRATEGIES.md',
    'ARCH-PLAN-001-ROADMAP.md',
    'ARCH-PLAN-001-EXECUTIVE-SUMMARY.md'
  ];
  for (const doc of docs) {
    assert.ok(fs.existsSync(path.join(ROADMAP_DOCS, doc)), `missing ${doc}`);
  }
});

console.log(`\nARCH-PLAN-001 planning: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
