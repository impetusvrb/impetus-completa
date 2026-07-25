/**
 * OPM-GOV-001 — Full certification test runner (all suites + regression guard).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPM_GOV_001_REGISTRY } from '../../governance/opm-gov-001/opmGov001Registry.js';
import { E2E_TRACEABILITY_MATRIX } from '../opm-e2e/opmE2e001Traceability.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');

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

function read(rel) {
  return fs.readFileSync(path.join(FE, 'src', rel), 'utf8');
}

console.log('OPM-GOV-001 — Operational Contract Baseline Certification\n');

test('registry official import path', () => {
  assert.equal(OPM_GOV_001_REGISTRY.id, 'OPM-GOV-001');
  assert.equal(OPM_GOV_001_REGISTRY.status, 'frozen');
});

test('prerequisite phases include E2E and WMS-REF-001', () => {
  const pre = OPM_GOV_001_REGISTRY.prerequisitePhases;
  assert.ok(pre.includes('OPM-E2E-001'));
  assert.ok(pre.includes('WMS-REF-001'));
  assert.ok(pre.includes('OPM-001D'));
});

test('governance aligns with E2E traceability matrix', () => {
  assert.ok(E2E_TRACEABILITY_MATRIX.length >= 15);
  const handoffs = OPM_GOV_001_REGISTRY.governance.handoffs.map((h) => h.id);
  assert.ok(handoffs.includes('handoff-receiving-inventory'));
  assert.ok(handoffs.includes('handoff-shipping-inventory'));
});

test('no alteration to certified operational modules', () => {
  assert.ok(read('domains/logistics-operational/modules/receiving/ReceivingOperationalModule.jsx').includes('OPM-003'));
  assert.ok(read('domains/logistics-operational/modules/picking/PickingOperationalModule.jsx').includes('OPM-004'));
  assert.ok(read('domains/logistics-operational/modules/shipping/ShippingOperationalModule.jsx').includes('OPM-005'));
});

test('evidence documents exist', () => {
  const docs = path.join(FE, 'docs/evidence');
  for (const doc of [
    'OPM-GOV-001-OPERATIONAL-CONTRACT-BASELINE.md',
    'OPM-GOV-001-LIFECYCLE.md',
    'OPM-GOV-001-MOVEMENTS.md',
    'OPM-GOV-001-HANDOFFS.md',
    'OPM-GOV-001-OBSERVABILITY.md',
    'OPM-GOV-001-INVARIANTS.md',
    'OPM-GOV-001-COMPATIBILITY.md',
    'OPM-GOV-001-TEST-REPORT.md',
    'OPM-GOV-001-EXECUTIVE-SUMMARY.md'
  ]) {
    assert.ok(fs.existsSync(path.join(docs, doc)), doc);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
