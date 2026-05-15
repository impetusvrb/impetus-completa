'use strict';

/**
 * Cognitive Policy Engine — Fase 12 (Policy Governance Evolution — read-only)
 *
 *   npm run test:policy-evolution
 */

const assert = require('assert');

const envSnapshot = { ...process.env };

function purge() {
  try {
    delete require.cache[require.resolve('../services/cognitivePolicyGovernanceEvolutionService.js')];
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

function test1EvolutionCreation() {
  purge();
  process.env.IMPETUS_POLICY_EVOLUTION_ENABLED = 'true';
  const ev = require('../services/cognitivePolicyGovernanceEvolutionService');
  const r = ev.createGovernanceEvolution({
    timeline_window: ev.POLICY_EVOLUTION_WINDOWS.D30,
    topology_evolution: [],
    obligation_evolution: [],
    arbitration_evolution: [],
    governance_trends: []
  });
  assert.ok(r.evolution_id);
  assert.strictEqual(r.timeline_window, ev.POLICY_EVOLUTION_WINDOWS.D30);
  assert.ok(Array.isArray(r.trace));
  console.log('  PASS  1 evolution creation');
}

function test2TopologyEvolution() {
  purge();
  const ev = require('../services/cognitivePolicyGovernanceEvolutionService');
  const { topology_evolution } = ev.analyzeTopologyEvolution({
    diffs: [{ analysis: { topology_changes: [{}, {}, {}] } }, { analysis: { topology_changes: [{}, {}, {}, {}] } }],
    graph: { nodes: new Array(22).fill({}), edges: new Array(16).fill({}) }
  });
  assert.ok(topology_evolution.length >= 1);
  assert.ok(topology_evolution[0].trend);
  console.log('  PASS  2 topology evolution');
}

function test3ObligationEvolution() {
  purge();
  const ev = require('../services/cognitivePolicyGovernanceEvolutionService');
  const { obligation_evolution } = ev.analyzeObligationEvolution({
    sandbox: [
      { mirrored_obligations: [{ type: 'HITL_REQUIRED' }] },
      { mirrored_obligations: [{ type: 'HITL_REQUIRED' }, { type: 'TRACE_REQUIRED' }, { type: 'TRACE_REQUIRED' }] }
    ],
    diffs: []
  });
  assert.ok(obligation_evolution.length >= 1);
  console.log('  PASS  3 obligation evolution');
}

function test4ArbitrationEvolution() {
  purge();
  const ev = require('../services/cognitivePolicyGovernanceEvolutionService');
  const { arbitration_evolution } = ev.analyzeArbitrationEvolution({
    sandbox: [
      { sandbox_arbitration: { dominant_domain: 'SAFETY', override_pressure: 'low' } },
      { sandbox_arbitration: { dominant_domain: 'SAFETY', override_pressure: 'low' } }
    ],
    diffs: []
  });
  assert.ok(arbitration_evolution.length >= 1);
  console.log('  PASS  4 arbitration evolution');
}

function test5GovernanceTrajectory() {
  purge();
  const ev = require('../services/cognitivePolicyGovernanceEvolutionService');
  const { trajectory } = ev.calculateGovernanceTrajectory({
    topology: ev.POLICY_EVOLUTION_TRENDS.VOLATILE,
    obligation: ev.POLICY_EVOLUTION_TRENDS.VOLATILE,
    arbitration: ev.POLICY_EVOLUTION_TRENDS.STABLE,
    risk: ev.POLICY_EVOLUTION_TRENDS.STABLE
  });
  assert.strictEqual(trajectory.trend, ev.POLICY_EVOLUTION_TRENDS.VOLATILE);
  console.log('  PASS  5 governance trajectory');
}

function test6RiskEvolution() {
  purge();
  const ev = require('../services/cognitivePolicyGovernanceEvolutionService');
  const { risk_evolution } = ev.analyzeRiskEvolution(
    [
      { runtime_risk: { level: 'low' }, predicted_effects: [] },
      { runtime_risk: { level: 'high' }, predicted_effects: ['escalation_pressure', 'governance_complexity'] }
    ],
    { escalation_growth: true }
  );
  assert.ok(risk_evolution.trend);
  console.log('  PASS  6 risk evolution');
}

function test7EvolutionTrace() {
  purge();
  const ev = require('../services/cognitivePolicyGovernanceEvolutionService');
  let t = [];
  t = ev.appendEvolutionTrace(t, {
    type: 'EVOLUTION',
    message: 'Governance trajectory remained stable'
  });
  assert.strictEqual(t[0].type, 'EVOLUTION');
  assert.ok(String(t[0].message || '').includes('trajectory'));
  console.log('  PASS  7 evolution trace');
}

function test8Validation() {
  purge();
  process.env.IMPETUS_POLICY_EVOLUTION_ENABLED = 'true';
  const ev = require('../services/cognitivePolicyGovernanceEvolutionService');
  const rep = ev.generateGovernanceEvolutionReport();
  const v = ev.validateGovernanceEvolution(rep);
  assert.strictEqual(v.valid, true, v.errors && JSON.stringify(v.errors));
  const bad = { ...rep, timeline_window: 'invalid' };
  const v2 = ev.validateGovernanceEvolution(bad);
  assert.strictEqual(v2.valid, false);
  console.log('  PASS  8 validation');
}

function test9DashboardPayload() {
  purge();
  process.env.IMPETUS_POLICY_EVOLUTION_ENABLED = 'true';
  const ev = require('../services/cognitivePolicyGovernanceEvolutionService');
  const p = ev.generatePolicyGovernanceEvolutionAdminPayload();
  assert.ok(p.snapshot);
  assert.ok(p.demo_evolution);
  assert.ok(p.demo_evolution.evolution_id);
  assert.strictEqual(p.snapshot.evolution_enabled, true);
  console.log('  PASS  9 dashboard payload');
}

function test10KillSwitch() {
  purge();
  process.env.IMPETUS_POLICY_EVOLUTION_ENABLED = 'false';
  const ev = require('../services/cognitivePolicyGovernanceEvolutionService');
  assert.strictEqual(ev.isPolicyEvolutionEnabled(), false);
  const d = ev.getPolicyGovernanceEvolutionDashboardSummary();
  assert.strictEqual(d.enabled, false);
  assert.strictEqual(d.code, 'POLICY_EVOLUTION_DISABLED');
  console.log('  PASS  10 kill switch');
}

function main() {
  console.log('\n=== policyGovernanceEvolutionScenarios ===\n');
  try {
    test1EvolutionCreation();
    test2TopologyEvolution();
    test3ObligationEvolution();
    test4ArbitrationEvolution();
    test5GovernanceTrajectory();
    test6RiskEvolution();
    test7EvolutionTrace();
    test8Validation();
    test9DashboardPayload();
    test10KillSwitch();
    console.log('\n[POLICY_GOVERNANCE_EVOLUTION_SCENARIOS] ok\n');
  } finally {
    restoreEnv();
    purge();
  }
}

main();
