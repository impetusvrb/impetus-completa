/**
 * CPL-003 — Catalog tests.
 */
import assert from 'node:assert/strict';
import {
  COGNITIVE_CAPABILITY_CATALOG,
  getCatalogEntry,
  listCatalogByDomain,
  listCatalogByStatus,
  validateCatalogIntegrity
} from '../../platform/cognitive/governance/catalog/index.js';
import { COGNITIVE_PLATFORM_REGISTRY } from '../../platform/cognitive/registry/cognitivePlatformRegistry.js';

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

console.log('CPL-003 — catalog.test\n');

test('catalog generated from registry without duplication', () => {
  const result = validateCatalogIntegrity();
  assert.equal(result.valid, true, result.issues.join('; '));
  assert.equal(COGNITIVE_CAPABILITY_CATALOG.length, COGNITIVE_PLATFORM_REGISTRY.length);
});

test('catalog entry has Capability Domain Adapter Status', () => {
  const entry = getCatalogEntry('recommendation_engine');
  assert.ok(entry.capabilityId);
  assert.ok(entry.domain);
  assert.equal(entry.adapter, 'logistics_adapter');
  assert.equal(entry.status, 'active');
});

test('listCatalogByDomain and listCatalogByStatus', () => {
  assert.ok(listCatalogByDomain('logistics_wms').length >= 5);
  assert.ok(listCatalogByStatus('active').length >= 1);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
