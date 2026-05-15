'use strict';

/**
 * Cognitive Policy Engine — Fase 4 (Policy Facade read-only)
 *
 *   npm run test:policy-facade
 *   node src/tests/policyFacadeScenarios.js
 */

const assert = require('assert');

const envSnapshot = { ...process.env };

function purge() {
  for (const p of [
    '../services/cognitivePolicyFacadeService.js',
    '../services/cognitivePolicyDecisionService.js',
    '../services/cognitivePolicySignalService.js'
  ]) {
    try {
      delete require.cache[require.resolve(p)];
    } catch (_e) {}
  }
}

function restoreEnv() {
  for (const k of Object.keys(process.env)) {
    if (!(k in envSnapshot)) delete process.env[k];
  }
  for (const [k, v] of Object.entries(envSnapshot)) {
    process.env[k] = v;
  }
}

function test1FacadeEvaluation() {
  purge();
  process.env.IMPETUS_POLICY_FACADE_ENABLED = 'true';
  const facade = require('../services/cognitivePolicyFacadeService');
  const sig = require('../services/cognitivePolicySignalService');
  const ctx = { tenant_scope: 'c1', runtime_scope: 'dashboard_chat' };
  const signals = [
    sig.adaptSafetySignal({ risk_score: 0.2, risk_level: 'warning', engine_enabled: true }, ctx),
    sig.adaptCsiSignal({ csi: 80, status: 'healthy', unavailable: false }, ctx)
  ];
  const out = facade.evaluatePolicyFacade({ signals, context: {}, channel: 'dashboard_chat', tenant: {} });
  assert.ok(out.decision);
  assert.ok(out.summary);
  assert.ok(Array.isArray(out.trace));
  assert.strictEqual(typeof out.decision.allow, 'boolean');
  console.log('  PASS  1 facade evaluation');
}

function test2RiskComposition() {
  purge();
  const facade = require('../services/cognitivePolicyFacadeService');
  const d = require('../services/cognitivePolicyDecisionService');
  assert.strictEqual(facade.composePolicyRiskLevel({ critical: 1 }), d.POLICY_RISK_LEVELS.CRITICAL);
  assert.strictEqual(facade.composePolicyRiskLevel({ high: 2 }), d.POLICY_RISK_LEVELS.HIGH);
  assert.strictEqual(facade.composePolicyRiskLevel({ warning: 3 }), d.POLICY_RISK_LEVELS.WARNING);
  assert.strictEqual(facade.composePolicyRiskLevel({ warning: 1 }), d.POLICY_RISK_LEVELS.SAFE);
  console.log('  PASS  2 risk composition');
}

function test3EffectsComposition() {
  purge();
  const facade = require('../services/cognitivePolicyFacadeService');
  const sig = require('../services/cognitivePolicySignalService');
  const ctx = {};
  const sInt = sig.adaptIntegritySignal({ integrity_failures: 0, status: 'critical', block_mode: true }, ctx);
  const e = facade.composePolicyEffects([sInt], {});
  assert.ok(e.includes('BLOCK'));
  console.log('  PASS  3 effects composition');
}

function test4ObligationsComposition() {
  purge();
  const facade = require('../services/cognitivePolicyFacadeService');
  const decision = require('../services/cognitivePolicyDecisionService');
  const sig = require('../services/cognitivePolicySignalService');
  const ctx = {};
  const sSafe = sig.adaptSafetySignal({ risk_score: 1, risk_level: 'critical', engine_enabled: true }, ctx);
  const ob = facade.composePolicyObligations([sSafe], []);
  assert.ok(ob.includes(decision.POLICY_OBLIGATIONS.HITL_REQUIRED));
  console.log('  PASS  4 obligations composition');
}

function test5Correlations() {
  purge();
  const facade = require('../services/cognitivePolicyFacadeService');
  const sig = require('../services/cognitivePolicySignalService');
  const ctx = {};
  const drift = sig.adaptDriftSignal({ recent_drift_events: 20, high_severity: 1 }, ctx);
  const cal = sig.adaptCalibrationSignal({ overconfidence_events: 8, underconfidence_events: 0 }, ctx);
  const { correlations } = facade.detectPolicyCorrelations([drift, cal], {}, {});
  assert.ok(correlations.some((c) => c.type === 'drift_calibration_anomaly'));
  console.log('  PASS  5 correlations');
}

function test6TraceAggregation() {
  purge();
  const facade = require('../services/cognitivePolicyFacadeService');
  const decision = require('../services/cognitivePolicyDecisionService');
  let t = facade.appendPolicyFacadeTrace([], {
    type: decision.POLICY_TRACE_TYPES.DECISION,
    message: 'Facade composed HIGH risk level'
  });
  assert.strictEqual(t.length, 1);
  assert.ok(t[0].message.includes('HIGH'));
  console.log('  PASS  6 trace aggregation');
}

function test7Validation() {
  purge();
  process.env.IMPETUS_POLICY_FACADE_ENABLED = 'true';
  const facade = require('../services/cognitivePolicyFacadeService');
  const sig = require('../services/cognitivePolicySignalService');
  const c = { tenant_scope: 'x', runtime_scope: 'y' };
  const input = {
    signals: [sig.adaptCsiSignal({ csi: 50, status: 'info' }, c)],
    context: {},
    channel: 'x',
    tenant: {}
  };
  const out = facade.evaluatePolicyFacade(input);
  const v = facade.validatePolicyFacadeResult(out);
  assert.strictEqual(v.valid, true);
  console.log('  PASS  7 validation');
}

function test8Snapshot() {
  purge();
  process.env.IMPETUS_POLICY_FACADE_ENABLED = 'true';
  const facade = require('../services/cognitivePolicyFacadeService');
  const snap = facade.generatePolicyFacadeSnapshot();
  assert.strictEqual(typeof snap.facade_enabled, 'boolean');
  assert.ok(Array.isArray(snap.correlation_types));
  assert.ok(snap.correlation_types.includes('stability_risk'));
  console.log('  PASS  8 snapshot generation');
}

function test9DashboardPayload() {
  purge();
  process.env.IMPETUS_POLICY_FACADE_ENABLED = 'true';
  const facade = require('../services/cognitivePolicyFacadeService');
  const d = facade.getPolicyFacadeDashboardSummary();
  assert.strictEqual(d.enabled, true);
  assert.ok(typeof d.demo_signals_aggregated === 'number');
  assert.ok(Array.isArray(d.suggested_effects));
  assert.strictEqual(typeof d.correlations_detected, 'number');
  console.log('  PASS  9 dashboard payload');
}

function test10KillSwitch() {
  purge();
  process.env.IMPETUS_POLICY_FACADE_ENABLED = 'false';
  const facade = require('../services/cognitivePolicyFacadeService');
  assert.strictEqual(facade.isPolicyFacadeEnabled(), false);
  const d = facade.getPolicyFacadeDashboardSummary();
  assert.strictEqual(d.enabled, false);
  assert.strictEqual(d.code, 'POLICY_FACADE_DISABLED');
  const routeSim = facade.isPolicyFacadeEnabled()
    ? { ok: true }
    : { ok: false, code: 'POLICY_FACADE_DISABLED' };
  assert.strictEqual(routeSim.code, 'POLICY_FACADE_DISABLED');
  console.log('  PASS  10 kill switch');
}

function main() {
  console.log('\n=== policyFacadeScenarios ===\n');
  try {
    test1FacadeEvaluation();
    test2RiskComposition();
    test3EffectsComposition();
    test4ObligationsComposition();
    test5Correlations();
    test6TraceAggregation();
    test7Validation();
    test8Snapshot();
    test9DashboardPayload();
    test10KillSwitch();
    console.log('\n[POLICY_FACADE_SCENARIOS] ok\n');
  } finally {
    restoreEnv();
    purge();
  }
}

main();
