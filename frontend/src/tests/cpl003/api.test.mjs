/**
 * CPL-003 — Governance API + versions + forbidden dirs.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listGovernedCapabilities,
  getGovernedCapability,
  listByDomain,
  listByStatus,
  listByOwner,
  listConsumers,
  listCapabilityProviders,
  getDependencyGraph,
  getEnterpriseCatalog,
  validateCpl003GovernanceIntegrity,
  CAPABILITY_VERSIONS,
  getCapabilityVersion
} from '../../platform/cognitive/index.js';
import {
  listCapabilities,
  getCapability
} from '../../platform/cognitive/governance/api/cognitiveGovernanceApi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM = path.join(__dirname, '../../platform/cognitive');

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

console.log('CPL-003 — api.test\n');

test('governance API listCapabilities / getCapability', () => {
  const caps = listCapabilities();
  assert.ok(caps.length >= 10);
  const detail = getCapability('recommendation_engine');
  assert.ok(detail.lifecycle);
  assert.ok(detail.ownership);
  assert.ok(detail.version);
  assert.ok(detail.compatibility);
  assert.ok(detail.dependencyGraph);
});

test('barrel aliases avoid Discovery API collision', () => {
  const caps = listGovernedCapabilities();
  assert.ok(caps.length >= 10);
  assert.ok(getGovernedCapability('decision_trace'));
});

test('listByDomain listByStatus listByOwner listConsumers listProviders', () => {
  assert.ok(listByDomain('logistics_wms').length >= 5);
  assert.ok(listByStatus('active').length >= 1);
  assert.ok(listByOwner('wms-cognitive').length >= 1);
  assert.ok(listConsumers('recommendation_engine').length >= 1);
  assert.ok(listCapabilityProviders('risk_scoring').some((p) => p.role === 'canonical'));
});

test('enterprise catalog and dependency graph', () => {
  assert.equal(getEnterpriseCatalog().length, listGovernedCapabilities().length);
  const g = getDependencyGraph();
  assert.ok(g.summary.nodes >= 20);
});

test('versioning independent of providers', () => {
  const v = getCapabilityVersion('recommendation_engine');
  assert.equal(v.current, '2.0.0');
  assert.ok(v.history.length >= 2);
  assert.ok(Object.keys(CAPABILITY_VERSIONS).length >= 10);
});

test('CPL-003 governance integrity validation', () => {
  const result = validateCpl003GovernanceIntegrity();
  assert.equal(result.valid, true, result.issues.join('; '));
});

test('forbidden engine directories absent under governance and platform', () => {
  for (const forbidden of ['engines', 'decision', 'recommendation', 'ai', 'simulation', 'runtime']) {
    assert.ok(!fs.existsSync(path.join(PLATFORM, 'governance', forbidden)), `governance/${forbidden}`);
  }
  // runtime exists at platform level (CPL-002) — must NOT be under governance
  assert.ok(fs.existsSync(path.join(PLATFORM, 'runtime')));
  assert.ok(!fs.existsSync(path.join(PLATFORM, 'governance', 'runtime')));
});

test('governance folder structure present', () => {
  for (const dir of ['lifecycle', 'ownership', 'compatibility', 'catalog', 'api', 'versioning', 'graph']) {
    assert.ok(fs.existsSync(path.join(PLATFORM, 'governance', dir)), dir);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
