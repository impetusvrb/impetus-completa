/**
 * CPL-003 — Dependency graph tests.
 */
import assert from 'node:assert/strict';
import {
  buildCapabilityDependencyGraph,
  getCapabilityDependencies
} from '../../platform/cognitive/governance/graph/index.js';

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

console.log('CPL-003 — graph.test\n');

test('full dependency graph has nodes and edges', () => {
  const graph = buildCapabilityDependencyGraph();
  assert.ok(graph.nodes.length >= 20);
  assert.ok(graph.edges.length >= 20);
  assert.ok(graph.summary.capabilities >= 10);
});

test('graph relates Capability → Adapter → Provider → Consumer', () => {
  const graph = getCapabilityDependencies('recommendation_engine');
  const types = new Set(graph.nodes.map((n) => n.type));
  assert.ok(types.has('capability'));
  assert.ok(types.has('adapter'));
  assert.ok(types.has('provider'));
  assert.ok(types.has('consumer'));
  assert.ok(graph.edges.some((e) => e.relation === 'exposed_via'));
  assert.ok(graph.edges.some((e) => e.relation === 'implemented_by'));
  assert.ok(graph.edges.some((e) => e.relation === 'consumes'));
});

test('graph is read-only structure', () => {
  const graph = buildCapabilityDependencyGraph('smart_panel');
  assert.equal(graph.summary.capabilities, 1);
  assert.throws(() => {
    graph.nodes.push({ id: 'x' });
  });
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
