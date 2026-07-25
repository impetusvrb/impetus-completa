/**
 * ENT-001 — Baseline integrity + catalog tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ENT_001_PHASE,
  ENT_001_PRINCIPLE,
  getBaseline,
  getDomainCatalog,
  getModuleCatalog,
  getRuntimeCatalog,
  getCognitiveCatalog,
  getOperationalCatalog,
  getIntegrationCatalog,
  getCrossDomainMatrix,
  getPlatformHeatmap,
  getEvolutionCandidates,
  getExecutiveSummary,
  validateEnt001Integrity,
  listHeatmapByMaturity
} from '../../platform/knowledge/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const BASELINE_DOCS = path.join(FE, 'docs/platform-baseline');

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

console.log('ENT-001 — baseline.test\n');

test('CONSOLIDATE BEFORE EVOLVE principle', () => {
  assert.equal(ENT_001_PRINCIPLE, 'CONSOLIDATE BEFORE EVOLVE');
  assert.equal(ENT_001_PHASE, 'ENT-001');
});

test('enterprise baseline integrity', () => {
  const result = validateEnt001Integrity();
  assert.equal(result.valid, true, result.issues.join('; '));
});

test('domain catalog covers certified logistics', () => {
  const domains = getDomainCatalog();
  const wms = domains.find((d) => d.domainId === 'logistics_wms');
  assert.ok(wms);
  assert.equal(wms.maturity, 'certified');
  assert.ok(domains.length >= 15);
});

test('module catalog consolidates WMS + FIN-AUD', () => {
  const modules = getModuleCatalog();
  assert.ok(modules.some((m) => m.moduleId === 'receiving'));
  assert.ok(modules.some((m) => m.moduleId === 'financial_intelligence'));
  assert.ok(modules.length >= 25);
});

test('runtime catalog includes WMS baseline + adapters', () => {
  const runtimes = getRuntimeCatalog();
  assert.ok(runtimes.some((r) => r.runtimeId === 'wms_enterprise_baseline'));
  assert.ok(runtimes.some((r) => r.runtimeId === 'logistics_adapter'));
});

test('cognitive catalog reuses CPL registry', () => {
  const cognitive = getCognitiveCatalog();
  assert.ok(cognitive.some((c) => c.capabilityId === 'recommendation_engine'));
  assert.ok(cognitive.length >= 20);
});

test('operational catalog frozen WMS', () => {
  const op = getOperationalCatalog();
  assert.equal(op.frozen, true);
  assert.ok(op.phases.length >= 10);
});

test('integration catalog includes REG recovery chains', () => {
  const integrations = getIntegrationCatalog();
  assert.ok(integrations.some((i) => i.integrationId === 'chain:mapa_vazamentos'));
});

test('cross-domain matrix row per domain', () => {
  const matrix = getCrossDomainMatrix();
  const domains = getDomainCatalog();
  assert.equal(matrix.length, domains.length);
  const finance = matrix.find((r) => r.domainId === 'finance');
  assert.ok(finance);
});

test('platform heatmap classifies maturity', () => {
  const heatmap = getPlatformHeatmap();
  assert.ok(listHeatmapByMaturity('certified').length >= 1);
  assert.ok(listHeatmapByMaturity('not_started').length >= 2);
});

test('evolution candidates prioritize finance with integrate_then_develop', () => {
  const evo = getEvolutionCandidates();
  const finance = evo.domainCandidates.find((d) => d.domainId === 'finance');
  assert.equal(finance.recommendation, 'integrate_then_develop');
  assert.ok(evo.reg002Completed.length >= 3);
});

test('executive summary answers platform question', () => {
  const summary = getExecutiveSummary();
  assert.ok(summary.answer.domains >= 15);
  assert.ok(summary.answer.modules >= 25);
  assert.ok(summary.sourcesConsolidated.includes('CPL-001'));
  assert.ok(summary.sourcesConsolidated.includes('FIN-AUD-001'));
  assert.ok(summary.sourcesConsolidated.includes('REG-002'));
});

test('baseline object complete', () => {
  const baseline = getBaseline();
  assert.ok(baseline.domainCatalog.length >= 15);
  assert.ok(baseline.summary.heatmapSummary.certified >= 1);
});

test('platform-baseline documentation deliverables exist', () => {
  const docs = [
    'ENT-001-ENTERPRISE-DOMAIN-CATALOG.md',
    'ENT-001-MODULE-CATALOG.md',
    'ENT-001-RUNTIME-CATALOG.md',
    'ENT-001-COGNITIVE-CATALOG.md',
    'ENT-001-INTEGRATION-CATALOG.md',
    'ENT-001-PLATFORM-HEATMAP.md',
    'ENT-001-EVOLUTION-CANDIDATES.md',
    'ENT-001-ENTERPRISE-BASELINE.md',
    'ENT-001-EXECUTIVE-SUMMARY.md'
  ];
  for (const doc of docs) {
    assert.ok(fs.existsSync(path.join(BASELINE_DOCS, doc)), `missing ${doc}`);
  }
});

console.log(`\nENT-001 baseline: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
