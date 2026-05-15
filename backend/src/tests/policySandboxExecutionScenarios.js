'use strict';

/**
 * Cognitive Policy Engine — Fase 10 (Policy Sandbox Execution shadow read-only)
 *
 *   npm run test:policy-sandbox
 */

const assert = require('assert');

const envSnapshot = { ...process.env };

function purge() {
  try {
    delete require.cache[require.resolve('../services/cognitivePolicySandboxRuntimeService.js')];
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

function test1SandboxCreation() {
  purge();
  const sb = require('../services/cognitivePolicySandboxRuntimeService');
  const r = sb.createSandboxExecution({
    sandbox_mode: sb.POLICY_SANDBOX_MODES.SHADOW,
    production_untouched: true,
    mirrored_obligations: [{ type: 'HITL_REQUIRED', sandbox_only: true }],
    sandbox_arbitration: { dominant_domain: 'SAFETY' },
    divergences: [],
    runtime_pressure: { level: 'low' }
  });
  assert.ok(r.sandbox_execution_id);
  assert.strictEqual(r.sandbox_mode, 'shadow');
  assert.strictEqual(r.production_untouched, true);
  console.log('  PASS  1 sandbox creation');
}

function test2MirroredObligations() {
  purge();
  const sb = require('../services/cognitivePolicySandboxRuntimeService');
  const { mirrored_obligations } = sb.mirrorGovernanceObligations({
    obligations: [
      { type: 'HITL_REQUIRED', domain: 'SAFETY' },
      { type: 'TRACE_REQUIRED', domain: 'INTEGRITY' },
      { type: 'SECURITY_REVIEW', domain: 'SECURITY' },
      { type: 'LIMIT_AUTONOMY', domain: 'AUTONOMY' }
    ]
  });
  assert.strictEqual(mirrored_obligations.length, 4);
  assert.strictEqual(mirrored_obligations.every((x) => x.sandbox_only === true), true);
  console.log('  PASS  2 mirrored obligations');
}

function test3SandboxArbitration() {
  purge();
  const sb = require('../services/cognitivePolicySandboxRuntimeService');
  const { sandbox_arbitration } = sb.runSandboxArbitration({
    winner: { domain: 'SAFETY' },
    simulated_overrides: new Array(10).fill({})
  });
  assert.ok(sandbox_arbitration.dominant_domain);
  console.log('  PASS  3 sandbox arbitration');
}

function test4Divergences() {
  purge();
  const sb = require('../services/cognitivePolicySandboxRuntimeService');
  const { divergences } = sb.detectSandboxDivergences(
    { hitl_active: false, trace_depth: 0, obligations_applied: false },
    {
      mirrored_obligations: [{ type: 'HITL_REQUIRED' }],
      sandbox_arbitration: { dominant_domain: 'SAFETY' },
      simRun: {
        predicted_effects: ['escalation_pressure'],
        simulated_obligations: new Array(8).fill({})
      },
      trace_hint: [1, 2, 3, 4, 5, 6]
    }
  );
  assert.ok(divergences.length >= 1);
  console.log('  PASS  4 divergences');
}

function test5RuntimePressure() {
  purge();
  const sb = require('../services/cognitivePolicySandboxRuntimeService');
  const { runtime_pressure } = sb.analyzeSandboxRuntimePressure({
    mirrored_obligations: new Array(8).fill({ type: 'X', sandbox_only: true }),
    sandbox_arbitration: { override_pressure: 'high' },
    simRun: { runtime_risk: { level: 'high' }, predicted_effects: ['escalation_pressure'] }
  });
  assert.ok(['low', 'moderate', 'high'].includes(runtime_pressure.level));
  console.log('  PASS  5 runtime pressure');
}

function test6SandboxTrace() {
  purge();
  const sb = require('../services/cognitivePolicySandboxRuntimeService');
  let t = [];
  t = sb.appendSandboxExecutionTrace(t, { type: 'SANDBOX', message: 'parallel twin active' });
  assert.strictEqual(t[0].type, 'SANDBOX');
  console.log('  PASS  6 sandbox trace');
}

function test7Validation() {
  purge();
  process.env.IMPETUS_POLICY_SANDBOX_ENABLED = 'true';
  const sb = require('../services/cognitivePolicySandboxRuntimeService');
  const rep = sb.generateSandboxExecutionReport();
  const v = sb.validateSandboxExecution(rep);
  assert.strictEqual(v.valid, true, v.errors && JSON.stringify(v.errors));
  const bad = {
    sandbox_execution_id: 'x',
    sandbox_mode: 'invalid',
    production_untouched: false,
    simulated_governance: {},
    mirrored_obligations: [{ type: 'A', shadow: true }],
    sandbox_arbitration: {},
    sandbox_effects: [],
    divergences: [{ type: 'NOT_REAL', severity: 'x' }],
    runtime_pressure: null,
    trace: []
  };
  const v2 = sb.validateSandboxExecution(bad);
  assert.strictEqual(v2.valid, false);
  console.log('  PASS  7 validation');
}

function test8SnapshotGeneration() {
  purge();
  process.env.IMPETUS_POLICY_SANDBOX_ENABLED = 'true';
  const sb = require('../services/cognitivePolicySandboxRuntimeService');
  const s = sb.generateSandboxExecutionSnapshot();
  assert.ok(s.sandbox_modes.includes('shadow'));
  assert.ok(s.supported_divergences.includes('PRODUCTION_VS_SANDBOX'));
  console.log('  PASS  8 snapshot generation');
}

function test9DashboardPayload() {
  purge();
  process.env.IMPETUS_POLICY_SANDBOX_ENABLED = 'true';
  const sb = require('../services/cognitivePolicySandboxRuntimeService');
  const p = sb.generatePolicySandboxAdminPayload();
  assert.ok(p.snapshot);
  assert.ok(p.demo_sandbox);
  assert.strictEqual(p.demo_sandbox.production_untouched, true);
  console.log('  PASS  9 dashboard payload');
}

function test10KillSwitch() {
  purge();
  process.env.IMPETUS_POLICY_SANDBOX_ENABLED = 'false';
  const sb = require('../services/cognitivePolicySandboxRuntimeService');
  assert.strictEqual(sb.isPolicySandboxEnabled(), false);
  const d = sb.getPolicySandboxDashboardSummary();
  assert.strictEqual(d.enabled, false);
  assert.strictEqual(d.code, 'POLICY_SANDBOX_DISABLED');
  console.log('  PASS  10 kill switch');
}

function main() {
  console.log('\n=== policySandboxExecutionScenarios ===\n');
  try {
    test1SandboxCreation();
    test2MirroredObligations();
    test3SandboxArbitration();
    test4Divergences();
    test5RuntimePressure();
    test6SandboxTrace();
    test7Validation();
    test8SnapshotGeneration();
    test9DashboardPayload();
    test10KillSwitch();
    console.log('\n[POLICY_SANDBOX_EXECUTION_SCENARIOS] ok\n');
  } finally {
    restoreEnv();
    purge();
  }
}

main();
