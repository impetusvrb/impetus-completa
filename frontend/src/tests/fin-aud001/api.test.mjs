/**
 * FIN-AUD-001 — Audit API + gap analysis tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listCapabilities,
  listByDomain,
  listBrokenContracts,
  getGapAnalysisReport,
  validateFinAud001Integrity,
  getDependencyGraph
} from '../../platform/audit/finance/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const REPO = path.join(__dirname, '../../../..');
const AUDIT_DOCS = path.join(FE, 'docs/audits/finance');

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

console.log('FIN-AUD-001 — api.test\n');

test('audit API listCapabilities', () => {
  assert.ok(listCapabilities().length >= 20);
});

test('listByDomain platform_dashboard', () => {
  assert.ok(listByDomain('platform_dashboard').length >= 5);
});

test('broken contracts documented', () => {
  const broken = listBrokenContracts();
  assert.ok(broken.some((c) => c.contractId === 'dashboard.financialLeakage'));
});

test('gap analysis answers audit questions', () => {
  const gap = getGapAnalysisReport();
  assert.ok(gap.whatExists);
  assert.ok(gap.whatMustBeDeveloped.length >= 3);
  assert.equal(gap.criticalFinding.id, 'financial_leakage_routes_gap');
});

test('FIN-AUD-001 integrity validation', () => {
  const result = validateFinAud001Integrity();
  assert.equal(result.valid, true, result.issues.join('; '));
});

test('dependency graph via API', () => {
  const g = getDependencyGraph();
  assert.ok(g.summary.modules >= 3);
});

test('governance evidence documents exist', () => {
  const docs = [
    'FIN-AUD-001-DISCOVERY.md',
    'FIN-AUD-001-CAPABILITY-INVENTORY.md',
    'FIN-AUD-001-MODULE-MAP.md',
    'FIN-AUD-001-RUNTIME-MAP.md',
    'FIN-AUD-001-RULES.md',
    'FIN-AUD-001-CONTRACTS.md',
    'FIN-AUD-001-DEPENDENCY-GRAPH.md',
    'FIN-AUD-001-COGNITIVE-CAPABILITIES.md',
    'FIN-AUD-001-GAP-ANALYSIS.md',
    'FIN-AUD-001-EXECUTIVE-SUMMARY.md'
  ];
  for (const d of docs) {
    assert.ok(fs.existsSync(path.join(AUDIT_DOCS, d)), d);
  }
});

test('no forbidden business code under platform/audit', () => {
  const auditDir = path.join(FE, 'src/platform/audit/finance');
  const files = fs.readdirSync(auditDir);
  assert.ok(!files.some((f) => f.includes('Engine')));
  assert.ok(!files.some((f) => f.includes('Runtime') && f !== 'finAud001RuntimeMap.js'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
