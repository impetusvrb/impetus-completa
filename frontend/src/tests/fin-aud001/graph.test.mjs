/**
 * FIN-AUD-001 — Dependency graph tests.
 */
import assert from 'node:assert/strict';
import {
  buildFinanceDependencyGraph,
  getFinanceDependenciesForModule
} from '../../platform/audit/finance/index.js';

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

console.log('FIN-AUD-001 — graph.test\n');

test('full graph has domain module service contract nodes', () => {
  const g = buildFinanceDependencyGraph();
  const types = new Set(g.nodes.map((n) => n.type));
  assert.ok(types.has('domain'));
  assert.ok(types.has('module'));
  assert.ok(types.has('contract'));
  assert.ok(g.summary.edges >= 10);
});

test('broken contract appears in graph', () => {
  const g = buildFinanceDependencyGraph();
  assert.ok(g.nodes.some((n) => n.type === 'gap' || g.edges.some((e) => e.relation === 'broken')));
});

test('module dependencies for financial_intelligence', () => {
  const deps = getFinanceDependenciesForModule('financial_intelligence');
  assert.equal(deps.moduleId, 'financial_intelligence');
  assert.ok(deps.edges.length >= 1);
});

test('graph is frozen read-only', () => {
  const g = buildFinanceDependencyGraph();
  assert.throws(() => { g.nodes.push({}); });
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
