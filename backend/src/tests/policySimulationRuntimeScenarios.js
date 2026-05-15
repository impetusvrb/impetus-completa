'use strict';

/**
 * Cognitive Policy Engine — Fase 9 (Policy Simulation Runtime read-only)
 *
 *   npm run test:policy-simulation
 */

const assert = require('assert');

const envSnapshot = { ...process.env };

function purge() {
  try {
    delete require.cache[require.resolve('../services/cognitivePolicySimulationRuntimeService.js')];
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

function test1SimulationCreation() {
  purge();
  const s = require('../services/cognitivePolicySimulationRuntimeService');
  const r = s.createPolicySimulation({
    simulation_mode: s.POLICY_SIMULATION_MODES.DRY_RUN,
    overall_impact: s.POLICY_SIMULATION_IMPACT.LOW,
    predicted_effects: ['test'],
    simulated_obligations: [{ type: 'HITL_REQUIRED', simulated: true }],
    simulated_arbitration: { dominant_domain: 'SAFETY' },
    runtime_risk: { level: 'low', risks: [] }
  });
  assert.ok(r.simulation_id);
  assert.strictEqual(r.simulation_mode, 'dry_run');
  console.log('  PASS  1 simulation creation');
}

function test2PredictedEffects() {
  purge();
  const s = require('../services/cognitivePolicySimulationRuntimeService');
  const { predicted_effects } = s.predictGovernanceEffects({
    arbitration: { winner: { domain: 'SAFETY' }, conflicts: [{}, {}, {}, {}] },
    obligations: { obligations: new Array(6).fill({ type: 'AUDIT', domain: 'GOVERNANCE' }) },
    graph: { nodes: new Array(20).fill(1), edges: new Array(22).fill(1) }
  });
  assert.ok(predicted_effects.length >= 1);
  console.log('  PASS  2 predicted effects');
}

function test3SimulatedObligations() {
  purge();
  const s = require('../services/cognitivePolicySimulationRuntimeService');
  const { simulated_obligations } = s.simulateObligationExecution({
    obligations: [
      { type: 'HITL_REQUIRED', domain: 'SAFETY' },
      { type: 'TRACE_REQUIRED', domain: 'INTEGRITY' }
    ]
  });
  assert.strictEqual(simulated_obligations.length, 2);
  assert.strictEqual(simulated_obligations[0].simulated, true);
  console.log('  PASS  3 simulated obligations');
}

function test4ArbitrationSimulation() {
  purge();
  const s = require('../services/cognitivePolicySimulationRuntimeService');
  const ar = s.simulateArbitrationRuntime({
    winner: { domain: 'SAFETY' },
    conflicts: [{}],
    simulated_overrides: new Array(11).fill({ winner: 'A', overridden: 'B' })
  });
  assert.strictEqual(ar.dominant_domain, 'SAFETY');
  assert.strictEqual(ar.override_pressure, 'high');
  console.log('  PASS  4 arbitration simulation');
}

function test5RuntimeRisks() {
  purge();
  const s = require('../services/cognitivePolicySimulationRuntimeService');
  const input = {
    arbitration: {
      winner: { domain: 'SAFETY' },
      conflicts: [{}, {}, {}, {}],
      simulated_overrides: new Array(12).fill({})
    },
    obligations: {
      obligations: new Array(7).fill({ type: 'HITL_REQUIRED', domain: 'SAFETY', severity: 'critical' }),
      trace: new Array(8).fill({})
    },
    graph: { nodes: [], edges: [], trace: new Array(8).fill({}) },
    readiness: { overall_score: 30 }
  };
  const { runtime_risk } = s.analyzeSimulationRuntimeRisk(input, { predicted_effects: ['arbitration_instability'] });
  assert.ok(runtime_risk.risks.length >= 1);
  assert.ok(['low', 'moderate', 'high', 'critical'].includes(runtime_risk.level));
  console.log('  PASS  5 runtime risks');
}

function test6SimulationTrace() {
  purge();
  const s = require('../services/cognitivePolicySimulationRuntimeService');
  let t = [];
  t = s.appendSimulationTrace(t, {
    type: 'SIMULATION',
    message: 'Safety governance escalation simulated'
  });
  assert.strictEqual(t[0].type, 'SIMULATION');
  console.log('  PASS  6 simulation trace');
}

function test7Validation() {
  purge();
  process.env.IMPETUS_POLICY_SIMULATION_ENABLED = 'true';
  const s = require('../services/cognitivePolicySimulationRuntimeService');
  const rep = s.generateSimulationRuntimeReport();
  const v = s.validateSimulationRuntime(rep);
  assert.strictEqual(v.valid, true, v.errors && JSON.stringify(v.errors));
  const bad = {
    simulation_id: 'x',
    simulation_mode: 'dry_run',
    overall_impact: 'not_an_impact',
    predicted_effects: [],
    simulated_obligations: [{ type: 'X', simulated: false }],
    simulated_arbitration: {},
    runtime_risk: { level: 'nope', risks: [{ type: 'INVALID' }] },
    blocked_paths: [],
    warnings: [],
    trace: []
  };
  const v2 = s.validateSimulationRuntime(bad);
  assert.strictEqual(v2.valid, false);
  console.log('  PASS  7 validation');
}

function test8SnapshotGeneration() {
  purge();
  process.env.IMPETUS_POLICY_SIMULATION_ENABLED = 'true';
  const s = require('../services/cognitivePolicySimulationRuntimeService');
  const snap = s.generateSimulationRuntimeSnapshot();
  assert.ok(snap.simulation_modes.includes('dry_run'));
  assert.ok(snap.supported_runtime_risks.includes('OVER_BLOCKING'));
  console.log('  PASS  8 snapshot generation');
}

function test9DashboardPayload() {
  purge();
  process.env.IMPETUS_POLICY_SIMULATION_ENABLED = 'true';
  const s = require('../services/cognitivePolicySimulationRuntimeService');
  const p = s.generatePolicySimulationAdminPayload();
  assert.ok(p.snapshot);
  assert.ok(p.demo_simulation);
  assert.ok(Array.isArray(p.demo_simulation.predicted_effects));
  console.log('  PASS  9 dashboard payload');
}

function test10KillSwitch() {
  purge();
  process.env.IMPETUS_POLICY_SIMULATION_ENABLED = 'false';
  const s = require('../services/cognitivePolicySimulationRuntimeService');
  assert.strictEqual(s.isPolicySimulationEnabled(), false);
  const d = s.getPolicySimulationDashboardSummary();
  assert.strictEqual(d.enabled, false);
  assert.strictEqual(d.code, 'POLICY_SIMULATION_DISABLED');
  console.log('  PASS  10 kill switch');
}

function main() {
  console.log('\n=== policySimulationRuntimeScenarios ===\n');
  try {
    test1SimulationCreation();
    test2PredictedEffects();
    test3SimulatedObligations();
    test4ArbitrationSimulation();
    test5RuntimeRisks();
    test6SimulationTrace();
    test7Validation();
    test8SnapshotGeneration();
    test9DashboardPayload();
    test10KillSwitch();
    console.log('\n[POLICY_SIMULATION_RUNTIME_SCENARIOS] ok\n');
  } finally {
    restoreEnv();
    purge();
  }
}

main();
