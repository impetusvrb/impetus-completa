/**
 * FIN-AUD-001 — Discovery tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIN_AUD_001_PRINCIPLE,
  FIN_AUD_DISCOVERY_CATALOG,
  FINANCE_DOMAIN_STATUS,
  listCrossDomainReferences,
  validateDiscoveryIndex
} from '../../platform/audit/finance/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '../../../..');

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

console.log('FIN-AUD-001 — discovery.test\n');

test('AUDIT BEFORE BUILD principle defined', () => {
  assert.equal(FIN_AUD_001_PRINCIPLE, 'AUDIT BEFORE BUILD');
});

test('discovery catalog has finance-related entries', () => {
  const result = validateDiscoveryIndex();
  assert.equal(result.valid, true, result.issues.join('; '));
  assert.ok(result.count >= 20);
});

test('finance native domain is placeholder not implemented', () => {
  assert.equal(FINANCE_DOMAIN_STATUS.maturity, 'placeholder');
  assert.equal(FINANCE_DOMAIN_STATUS.nativeDomainPath, null);
});

test('cross-domain references registered', () => {
  const refs = listCrossDomainReferences();
  assert.ok(refs.length >= 4);
  assert.ok(refs.some((r) => r.domain === 'supply'));
});

test('key backend services exist on disk', () => {
  const samples = [
    'backend/src/services/industrialCostService.js',
    'backend/src/services/financialLeakageDetectorService.js',
    'backend/src/services/nexusBillingEngine/index.js'
  ];
  for (const p of samples) {
    assert.ok(fs.existsSync(path.join(REPO, p)), p);
  }
});

test('financial leakage service documented with route gap', () => {
  const entry = FIN_AUD_DISCOVERY_CATALOG.find((e) => e.id === 'financial_leakage_detector');
  assert.ok(entry);
  assert.equal(entry.status, 'service_complete_routes_missing');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
