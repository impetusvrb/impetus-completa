'use strict';

/**
 * Cognitive Policy Engine — Fase 11 (Policy Governance Diff — read-only)
 *
 *   npm run test:policy-diff
 */

const assert = require('assert');

const envSnapshot = { ...process.env };

function purge() {
  try {
    delete require.cache[require.resolve('../services/cognitivePolicyGovernanceDiffService.js')];
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

function test1DiffCreation() {
  purge();
  process.env.IMPETUS_POLICY_DIFF_ENABLED = 'true';
  const diff = require('../services/cognitivePolicyGovernanceDiffService');
  const r = diff.createGovernanceDiff({
    comparison_mode: diff.POLICY_DIFF_MODES.PRODUCTION_VS_SANDBOX,
    topology_changes: [],
    obligation_deltas: [],
    arbitration_deltas: []
  });
  assert.ok(r.diff_id);
  assert.strictEqual(r.comparison_mode, diff.POLICY_DIFF_MODES.PRODUCTION_VS_SANDBOX);
  assert.ok(Array.isArray(r.trace));
  console.log('  PASS  1 diff creation');
}

function test2TopologyDiff() {
  purge();
  const diff = require('../services/cognitivePolicyGovernanceDiffService');
  const { topology_changes } = diff.detectTopologyChanges(
    { governance_topology_nodes: 0, governance_topology_edges: 0, arbitration_domain_active: 'SAFETY' },
    {
      nodes: new Array(5).fill({ id: 'n' }),
      edges: new Array(4).fill({}),
      centrality: { dominant_domain: 'INTEGRITY' }
    }
  );
  assert.ok(topology_changes.length >= 1);
  assert.ok(topology_changes.some((x) => x.type === diff.POLICY_DIFF_TYPES.TOPOLOGY_SHIFT));
  console.log('  PASS  2 topology diff');
}

function test3ObligationDeltas() {
  purge();
  const diff = require('../services/cognitivePolicyGovernanceDiffService');
  const { obligation_deltas } = diff.detectObligationDeltas(
    { obligations_active_count: 0, hitl_active: false, trace_depth: 0 },
    {
      mirrored_obligations: [
        { type: 'HITL_REQUIRED', domain: 'SAFETY' },
        { type: 'TRACE_REQUIRED', domain: 'tenant' },
        { type: 'X', domain: 'tenant' }
      ],
      runtime_pressure: { obligation_pressure: 'high', level: 'moderate' }
    }
  );
  assert.ok(obligation_deltas.length >= 1);
  assert.ok(obligation_deltas.some((x) => x.type === diff.POLICY_DIFF_TYPES.OBLIGATION_EXPANSION));
  console.log('  PASS  3 obligation deltas');
}

function test4ArbitrationDeltas() {
  purge();
  const diff = require('../services/cognitivePolicyGovernanceDiffService');
  const { arbitration_deltas } = diff.detectArbitrationDeltas(
    { arbitration_domain_active: 'SAFETY' },
    { sandbox_arbitration: { dominant_domain: 'INTEGRITY', override_pressure: 'high', arbitration_loop_risk: true } }
  );
  assert.ok(arbitration_deltas.length >= 1);
  assert.ok(arbitration_deltas.some((x) => x.type === diff.POLICY_DIFF_TYPES.ARBITRATION_DOMINANCE));
  console.log('  PASS  4 arbitration deltas');
}

function test5GovernanceShift() {
  purge();
  const diff = require('../services/cognitivePolicyGovernanceDiffService');
  const { governance_shift } = diff.calculateGovernanceShift({
    topology_changes: [{ severity: diff.POLICY_DIFF_SEVERITY.MODERATE }],
    obligation_deltas: [{ severity: diff.POLICY_DIFF_SEVERITY.LOW }],
    arbitration_deltas: [{ severity: diff.POLICY_DIFF_SEVERITY.HIGH }]
  });
  assert.strictEqual(governance_shift.severity, diff.POLICY_DIFF_SEVERITY.HIGH);
  console.log('  PASS  5 governance shift');
}

function test6RiskDelta() {
  purge();
  const diff = require('../services/cognitivePolicyGovernanceDiffService');
  const { risk_delta } = diff.calculateRiskDelta(
    { runtime_pressure_level: 'minimal' },
    { runtime_pressure: { level: 'high' } },
    { runtime_risk: { level: 'moderate' }, predicted_effects: ['governance_complexity'] }
  );
  assert.ok(risk_delta.severity);
  assert.strictEqual(risk_delta.trace_explosion_hint, true);
  console.log('  PASS  6 risk delta');
}

function test7DiffTrace() {
  purge();
  const diff = require('../services/cognitivePolicyGovernanceDiffService');
  let t = [];
  t = diff.appendGovernanceDiffTrace(t, {
    type: 'DIFF',
    message: 'Governance topology shift detected'
  });
  assert.strictEqual(t[0].type, 'DIFF');
  assert.ok(String(t[0].message || '').includes('topology'));
  console.log('  PASS  7 diff trace');
}

function test8Validation() {
  purge();
  process.env.IMPETUS_POLICY_DIFF_ENABLED = 'true';
  const diff = require('../services/cognitivePolicyGovernanceDiffService');
  const rep = diff.generateGovernanceDiffReport();
  const v = diff.validateGovernanceDiff(rep);
  assert.strictEqual(v.valid, true, v.errors && JSON.stringify(v.errors));
  const bad = { ...rep, topology_changes: [{ type: 'NOT_A_TYPE' }] };
  const v2 = diff.validateGovernanceDiff(bad);
  assert.strictEqual(v2.valid, false);
  console.log('  PASS  8 validation');
}

function test9DashboardPayload() {
  purge();
  process.env.IMPETUS_POLICY_DIFF_ENABLED = 'true';
  const diff = require('../services/cognitivePolicyGovernanceDiffService');
  const p = diff.generatePolicyGovernanceDiffAdminPayload();
  assert.ok(p.snapshot);
  assert.ok(p.demo_diff);
  assert.ok(p.demo_diff.diff_id);
  assert.strictEqual(p.snapshot.diff_enabled, true);
  console.log('  PASS  9 dashboard payload');
}

function test10KillSwitch() {
  purge();
  process.env.IMPETUS_POLICY_DIFF_ENABLED = 'false';
  const diff = require('../services/cognitivePolicyGovernanceDiffService');
  assert.strictEqual(diff.isPolicyDiffEnabled(), false);
  const d = diff.getPolicyGovernanceDiffDashboardSummary();
  assert.strictEqual(d.enabled, false);
  assert.strictEqual(d.code, 'POLICY_DIFF_DISABLED');
  console.log('  PASS  10 kill switch');
}

function main() {
  console.log('\n=== policyGovernanceDiffScenarios ===\n');
  try {
    test1DiffCreation();
    test2TopologyDiff();
    test3ObligationDeltas();
    test4ArbitrationDeltas();
    test5GovernanceShift();
    test6RiskDelta();
    test7DiffTrace();
    test8Validation();
    test9DashboardPayload();
    test10KillSwitch();
    console.log('\n[POLICY_GOVERNANCE_DIFF_SCENARIOS] ok\n');
  } finally {
    restoreEnv();
    purge();
  }
}

main();
