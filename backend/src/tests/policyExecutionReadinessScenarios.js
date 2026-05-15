'use strict';

/**
 * Cognitive Policy Engine — Fase 8 (Policy Execution Readiness read-only)
 *
 *   npm run test:policy-readiness
 */

const assert = require('assert');

const envSnapshot = { ...process.env };

function purge() {
  try {
    delete require.cache[require.resolve('../services/cognitivePolicyExecutionReadinessService.js')];
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

function test1ReadinessCreation() {
  purge();
  const r = require('../services/cognitivePolicyExecutionReadinessService');
  const rec = r.createExecutionReadiness({
    overall_score: 70,
    status: r.POLICY_READINESS_STATUS.PARTIAL,
    domains: {},
    capabilities: {},
    blockers: [],
    warnings: [],
    recommendations: [],
    trace: []
  });
  assert.ok(rec.readiness_id);
  assert.strictEqual(rec.overall_score, 70);
  console.log('  PASS  1 readiness creation');
}

function test2ReadinessScoring() {
  purge();
  const r = require('../services/cognitivePolicyExecutionReadinessService');
  const analysis = r.analyzeExecutionReadiness({
    signals: { count: 4 },
    arbitration: { winner: { domain: 'SAFETY' }, conflicts: [{}], trace: [{ x: 1 }] },
    obligations: { obligations: [{ domain: 'SAFETY' }], trace: [{ x: 1 }] },
    graph: { nodes: [1, 2, 3], edges: [1, 2, 3, 4], summary: { validation_ok: true }, patterns: [] },
    safety: { coverage_hint: 0.8 },
    integrity: { coverage_hint: 0.6 },
    observability: { trace_layers: 4 },
    runtime: { stability_hint: 0.7, tenant_isolation_hint: true }
  });
  const scores = r.calculateReadinessScore(analysis);
  assert.ok(scores.overall_score >= 40);
  assert.ok(scores.breakdown.signals >= 0);
  console.log('  PASS  2 readiness scoring');
}

function test3Blockers() {
  purge();
  const r = require('../services/cognitivePolicyExecutionReadinessService');
  const analysis = r.analyzeExecutionReadiness({
    signals: { count: 0 },
    arbitration: {},
    obligations: { obligations: [] },
    graph: { nodes: [], edges: [] },
    runtime: { stability_hint: 0.1, tenant_isolation_hint: false }
  });
  const { blockers } = r.detectExecutionBlockers(analysis, {});
  assert.ok(blockers.some((b) => b.type === 'missing_obligations'));
  console.log('  PASS  3 blockers detection');
}

function test4Recommendations() {
  purge();
  const r = require('../services/cognitivePolicyExecutionReadinessService');
  const { blockers } = r.detectExecutionBlockers(
    r.analyzeExecutionReadiness({
      signals: { count: 0 },
      arbitration: {},
      obligations: { obligations: [] },
      graph: { nodes: [], edges: [] }
    }),
    {}
  );
  const { recommendations } = r.generateReadinessRecommendations(blockers, {}, {});
  assert.ok(recommendations.length >= 1);
  console.log('  PASS  4 recommendations');
}

function test5DomainReadiness() {
  purge();
  const r = require('../services/cognitivePolicyExecutionReadinessService');
  const input = {
    signals: { count: 2 },
    arbitration: { winner: { domain: 'SAFETY' } },
    obligations: {
      obligations: [
        { domain: 'SAFETY', type: 'HITL_REQUIRED' },
        { domain: 'INTEGRITY', type: 'TRACE_REQUIRED' }
      ]
    },
    graph: { centrality: { dominant_domain: 'SAFETY' }, summary: {} }
  };
  const analysis = r.analyzeExecutionReadiness(input);
  const { domains } = r.calculateDomainReadiness(input, analysis);
  assert.ok(domains.SAFETY && domains.SAFETY.score > 0);
  console.log('  PASS  5 domain readiness');
}

function test6ReadinessTrace() {
  purge();
  const r = require('../services/cognitivePolicyExecutionReadinessService');
  let t = [];
  t = r.appendExecutionReadinessTrace(t, { type: 'READINESS', message: 'scoring complete' });
  assert.strictEqual(t[0].type, 'READINESS');
  console.log('  PASS  6 readiness trace');
}

function test7Validation() {
  purge();
  process.env.IMPETUS_POLICY_READINESS_ENABLED = 'true';
  const r = require('../services/cognitivePolicyExecutionReadinessService');
  const rep = r.generateExecutionReadinessReport();
  const v = r.validateExecutionReadiness(rep);
  assert.strictEqual(v.valid, true, v.errors && JSON.stringify(v.errors));
  const bad = {
    readiness_id: 'invalid-demo',
    overall_score: 50,
    status: 'not_ready',
    domains: { SAFETY: { score: 999, status: 'ready' } },
    capabilities: { X: 1 },
    blockers: [],
    recommendations: [],
    trace: []
  };
  const v2 = r.validateExecutionReadiness(bad);
  assert.strictEqual(v2.valid, false);
  console.log('  PASS  7 validation');
}

function test8SnapshotGeneration() {
  purge();
  process.env.IMPETUS_POLICY_READINESS_ENABLED = 'true';
  const r = require('../services/cognitivePolicyExecutionReadinessService');
  const s = r.generateExecutionReadinessSnapshot();
  assert.ok(s.supported_capabilities.includes('SIGNAL_COVERAGE'));
  assert.ok(s.supported_domains.includes('SAFETY'));
  assert.ok(s.scoring_weights.graph === 20);
  console.log('  PASS  8 snapshot generation');
}

function test9DashboardPayload() {
  purge();
  process.env.IMPETUS_POLICY_READINESS_ENABLED = 'true';
  const r = require('../services/cognitivePolicyExecutionReadinessService');
  const p = r.generatePolicyExecutionReadinessAdminPayload();
  assert.ok(p.snapshot);
  assert.ok(p.demo_readiness);
  assert.ok(typeof p.demo_readiness.overall_score === 'number');
  assert.ok(Array.isArray(p.demo_readiness.trace));
  console.log('  PASS  9 dashboard payload');
}

function test10KillSwitch() {
  purge();
  process.env.IMPETUS_POLICY_READINESS_ENABLED = 'false';
  const r = require('../services/cognitivePolicyExecutionReadinessService');
  assert.strictEqual(r.isPolicyReadinessEnabled(), false);
  const d = r.getPolicyExecutionReadinessDashboardSummary();
  assert.strictEqual(d.enabled, false);
  assert.strictEqual(d.code, 'POLICY_READINESS_DISABLED');
  console.log('  PASS  10 kill switch');
}

function main() {
  console.log('\n=== policyExecutionReadinessScenarios ===\n');
  try {
    test1ReadinessCreation();
    test2ReadinessScoring();
    test3Blockers();
    test4Recommendations();
    test5DomainReadiness();
    test6ReadinessTrace();
    test7Validation();
    test8SnapshotGeneration();
    test9DashboardPayload();
    test10KillSwitch();
    console.log('\n[POLICY_EXECUTION_READINESS_SCENARIOS] ok\n');
  } finally {
    restoreEnv();
    purge();
  }
}

main();
