'use strict';

/**
 * Cognitive Policy Engine — Fase 7 (Policy Governance Graph read-only)
 *
 *   npm run test:policy-graph
 */

const assert = require('assert');

const envSnapshot = { ...process.env };

function purge() {
  try {
    delete require.cache[require.resolve('../services/cognitivePolicyGovernanceGraphService.js')];
  } catch (_e) {}
}

function restoreEnv() {
  for (const k of Object.keys(process.env)) {
    if (!(k in envSnapshot)) delete process.env[k];
  }
  for (const [k, v] of Object.entries(envSnapshot)) {
    process.env[k] = v;
  }
}

function test1NodeCreation() {
  purge();
  const g = require('../services/cognitivePolicyGovernanceGraphService');
  const n = g.createGraphNode({
    node_type: g.POLICY_GRAPH_NODE_TYPES.SIGNAL,
    domain: 'SAFETY',
    label: 'Critical Safety Signal',
    severity: 'critical',
    source: 'cognitiveSafetyRuntimeService',
    metadata: {}
  });
  assert.ok(n.node_id);
  assert.strictEqual(n.node_type, 'SIGNAL');
  assert.strictEqual(n.domain, 'SAFETY');
  console.log('  PASS  1 node creation');
}

function test2EdgeCreation() {
  purge();
  const g = require('../services/cognitivePolicyGovernanceGraphService');
  const e = g.createGraphEdge({
    from: 'node_a',
    to: 'node_b',
    relation_type: g.POLICY_GRAPH_RELATIONS.CAUSES,
    strength: 0.9,
    metadata: {}
  });
  assert.ok(e.edge_id);
  assert.strictEqual(e.relation_type, 'CAUSES');
  assert.strictEqual(e.strength, 0.9);
  console.log('  PASS  2 edge creation');
}

function test3GraphComposition() {
  purge();
  process.env.IMPETUS_POLICY_GRAPH_ENABLED = 'true';
  const g = require('../services/cognitivePolicyGovernanceGraphService');
  const { nodes, edges, summary } = g.composeGovernanceGraph({
    signals: [{ signal: 'SAFETY', severity: 'high' }],
    decision: { risk_level: 'high', effects: [] },
    arbitration: { conflicts: [], winner: { domain: 'SAFETY' } },
    obligations: [
      {
        obligation_id: 'obl-demo-1',
        type: 'HITL_REQUIRED',
        severity: 'high',
        domain: 'SAFETY',
        source: 'test',
        status: 'declared'
      }
    ]
  });
  assert.ok(nodes.length >= 4);
  assert.ok(edges.some((x) => x.relation_type === 'GENERATES'));
  assert.ok(summary.node_count >= 1);
  console.log('  PASS  3 graph composition');
}

function test4GraphPatterns() {
  purge();
  const g = require('../services/cognitivePolicyGovernanceGraphService');
  const { nodes, edges } = g.composeGovernanceGraph({
    signals: [
      { signal: 'SAFETY', severity: 'critical' },
      { signal: 'INTEGRITY', severity: 'critical' }
    ],
    decision: { risk_level: 'critical' },
    arbitration: { winner: { domain: 'SAFETY' } },
    obligations: [
      { type: 'HITL_REQUIRED', severity: 'critical', domain: 'SAFETY', status: 'declared' },
      { type: 'TRACE_REQUIRED', severity: 'high', domain: 'INTEGRITY', status: 'declared' }
    ]
  });
  const { patterns } = g.detectGovernanceGraphPatterns({ nodes, edges });
  assert.ok(Array.isArray(patterns));
  assert.ok(patterns.length >= 1);
  console.log('  PASS  4 graph patterns');
}

function test5GraphCentrality() {
  purge();
  const g = require('../services/cognitivePolicyGovernanceGraphService');
  const { nodes, edges } = g.composeGovernanceGraph({
    signals: [{ signal: 'SAFETY', severity: 'critical' }],
    decision: { risk_level: 'critical' },
    arbitration: { winner: { domain: 'SAFETY' } },
    obligations: [{ type: 'HITL_REQUIRED', severity: 'critical', domain: 'SAFETY', status: 'declared' }]
  });
  const c = g.calculateGraphCentrality({ nodes, edges });
  assert.ok(c.dominant_domain);
  assert.ok(c.dominant_obligation);
  console.log('  PASS  5 graph centrality');
}

function test6GraphTrace() {
  purge();
  const g = require('../services/cognitivePolicyGovernanceGraphService');
  let t = [];
  t = g.appendGovernanceGraphTrace(t, { type: 'GRAPH', message: 'SIGNAL generated OBLIGATION chain' });
  assert.ok(t.length >= 1);
  assert.strictEqual(t[0].type, 'GRAPH');
  console.log('  PASS  6 graph trace');
}

function test7GraphValidation() {
  purge();
  const g = require('../services/cognitivePolicyGovernanceGraphService');
  const a = g.createGraphNode({ node_type: 'SIGNAL', domain: 'X', label: 'a', severity: 'low' });
  const b = g.createGraphNode({ node_type: 'DECISION', domain: 'X', label: 'b', severity: 'low' });
  const e = g.createGraphEdge({ from: a.node_id, to: b.node_id, relation_type: 'GENERATES', strength: 1 });
  const v = g.validateGovernanceGraph({ nodes: [a, b], edges: [e] });
  assert.strictEqual(v.valid, true);
  const v2 = g.validateGovernanceGraph({
    nodes: [a],
    edges: [g.createGraphEdge({ from: 'bad', to: a.node_id, relation_type: 'GENERATES', strength: 1 })]
  });
  assert.strictEqual(v2.valid, false);
  console.log('  PASS  7 graph validation');
}

function test8SnapshotGeneration() {
  purge();
  process.env.IMPETUS_POLICY_GRAPH_ENABLED = 'true';
  const g = require('../services/cognitivePolicyGovernanceGraphService');
  const s = g.generateGovernanceGraphSnapshot();
  assert.ok(s.node_types.includes('SIGNAL'));
  assert.ok(s.relation_types.includes('GENERATES'));
  assert.ok(Array.isArray(s.supported_patterns));
  assert.strictEqual(s.graph_enabled, true);
  console.log('  PASS  8 snapshot generation');
}

function test9DashboardPayload() {
  purge();
  process.env.IMPETUS_POLICY_GRAPH_ENABLED = 'true';
  const g = require('../services/cognitivePolicyGovernanceGraphService');
  const p = g.generatePolicyGovernanceGraphAdminPayload();
  assert.ok(p.snapshot);
  assert.ok(p.demo_graph);
  assert.ok(Array.isArray(p.demo_graph.nodes));
  assert.ok(Array.isArray(p.demo_graph.edges));
  assert.ok(Array.isArray(p.demo_graph.patterns));
  assert.ok(p.demo_graph.centrality);
  console.log('  PASS  9 dashboard payload');
}

function test10KillSwitch() {
  purge();
  process.env.IMPETUS_POLICY_GRAPH_ENABLED = 'false';
  const g = require('../services/cognitivePolicyGovernanceGraphService');
  assert.strictEqual(g.isPolicyGraphEnabled(), false);
  const d = g.getPolicyGovernanceGraphDashboardSummary();
  assert.strictEqual(d.enabled, false);
  assert.strictEqual(d.code, 'POLICY_GRAPH_DISABLED');
  console.log('  PASS  10 kill switch');
}

function main() {
  console.log('\n=== policyGovernanceGraphScenarios ===\n');
  try {
    test1NodeCreation();
    test2EdgeCreation();
    test3GraphComposition();
    test4GraphPatterns();
    test5GraphCentrality();
    test6GraphTrace();
    test7GraphValidation();
    test8SnapshotGeneration();
    test9DashboardPayload();
    test10KillSwitch();
    console.log('\n[POLICY_GOVERNANCE_GRAPH_SCENARIOS] ok\n');
  } finally {
    restoreEnv();
    purge();
  }
}

main();
