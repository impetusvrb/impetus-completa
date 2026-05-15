'use strict';

/**
 * Cognitive Policy Engine — Fase 2 (Policy Decision Contract)
 *
 *   npm run test:policy-contract
 *   node src/tests/policyDecisionContractScenarios.js
 */

const assert = require('assert');

const envSnapshot = { ...process.env };

function purge() {
  try {
    delete require.cache[require.resolve('../services/cognitivePolicyDecisionService.js')];
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

function simulatePolicyContractRoute() {
  const svc = require('../services/cognitivePolicyDecisionService');
  if (!svc.isPolicyContractEnabled()) {
    return { status: 403, body: { ok: false, code: 'POLICY_CONTRACT_DISABLED' } };
  }
  return { status: 200, body: { ok: true, snapshot: svc.generateDecisionContractSnapshot() } };
}

function test1CreatePolicyDecision() {
  purge();
  process.env.IMPETUS_POLICY_CONTRACT_ENABLED = 'true';
  const svc = require('../services/cognitivePolicyDecisionService');
  const d = svc.createPolicyDecision({ allow: true, risk_level: svc.POLICY_RISK_LEVELS.WARNING });
  assert.ok(d.decision_id && String(d.decision_id).length > 8);
  assert.strictEqual(d.schema_version, svc.POLICY_DECISION_SCHEMA_VERSION);
  assert.strictEqual(d.allow, true);
  assert.strictEqual(d.risk_level, 'warning');
  assert.ok(Array.isArray(d.effects));
  console.log('  PASS  1 createPolicyDecision');
}

function test2NormalizePolicyDecision() {
  purge();
  const svc = require('../services/cognitivePolicyDecisionService');
  const d = svc.normalizePolicyDecision({
    decision_id: 'fixed-id-test',
    allow: false,
    effects: ['BLOCK'],
    signals: [{ signal: 'drift', severity: 'high', value: 1 }],
    policy_sources: ['integrity']
  });
  assert.strictEqual(d.decision_id, 'fixed-id-test');
  assert.strictEqual(d.allow, false);
  assert.deepStrictEqual(d.effects, ['BLOCK']);
  assert.ok(d.signals.length >= 1);
  assert.strictEqual(d.signals[0].signal, 'DRIFT');
  assert.ok(d.policy_sources.some((s) => s.id === 'integrity'));
  console.log('  PASS  2 normalizePolicyDecision');
}

function test3InvalidEnumsFallback() {
  purge();
  const svc = require('../services/cognitivePolicyDecisionService');
  const d = svc.normalizePolicyDecision({
    risk_level: 'not-a-real-level',
    effects: ['BLOCK', 'UNKNOWN_EFFECT', 'SOFTEN'],
    obligations: ['HITL_REQUIRED', 'INVALID_OBL']
  });
  assert.strictEqual(d.risk_level, svc.POLICY_RISK_LEVELS.SAFE);
  assert.ok(d.effects.includes('BLOCK'));
  assert.ok(d.effects.includes('SOFTEN'));
  assert.ok(!d.effects.includes('UNKNOWN_EFFECT'));
  assert.ok(d.obligations.includes('HITL_REQUIRED'));
  assert.ok(!d.obligations.includes('INVALID_OBL'));
  console.log('  PASS  3 invalid enums fallback');
}

function test4TraceAppend() {
  purge();
  const svc = require('../services/cognitivePolicyDecisionService');
  let d = svc.createPolicyDecision({});
  const before = d.trace.length;
  d = svc.appendPolicyTrace(d, {
    type: svc.POLICY_TRACE_TYPES.SIGNAL,
    source: 'csi',
    message: 'CSI below threshold'
  });
  assert.strictEqual(d.trace.length, before + 1);
  assert.strictEqual(d.trace[d.trace.length - 1].type, 'SIGNAL');
  assert.ok(d.trace[d.trace.length - 1].timestamp);
  console.log('  PASS  4 trace append');
}

function test5SignalNormalization() {
  purge();
  const svc = require('../services/cognitivePolicyDecisionService');
  const s = svc.normalizePolicySignals([{ signal: 'CSI', severity: 'warning', value: 62 }]);
  assert.strictEqual(s[0].signal, 'CSI');
  assert.strictEqual(s[0].severity, 'warning');
  assert.strictEqual(s[0].value, 62);
  console.log('  PASS  5 signal normalization');
}

function test6EffectNormalization() {
  purge();
  const svc = require('../services/cognitivePolicyDecisionService');
  const e = svc.normalizePolicyEffects(['soften', { effect: 'ROUTE' }, 'INVALID']);
  assert.ok(e.includes('SOFTEN'));
  assert.ok(e.includes('ROUTE'));
  assert.ok(!e.includes('INVALID'));
  console.log('  PASS  6 effect normalization');
}

function test7Validator() {
  purge();
  const svc = require('../services/cognitivePolicyDecisionService');
  const good = svc.normalizePolicyDecision({});
  let v = svc.validatePolicyDecision(good);
  assert.strictEqual(v.valid, true);
  assert.deepStrictEqual(v.errors, []);

  const bad = { ...good, schema_version: '0.0.0', risk_level: 'alien' };
  v = svc.validatePolicyDecision(bad);
  assert.strictEqual(v.valid, false);
  assert.ok(v.errors.length > 0);
  console.log('  PASS  7 validator');
}

function test8SnapshotGeneration() {
  purge();
  const svc = require('../services/cognitivePolicyDecisionService');
  const snap = svc.generateDecisionContractSnapshot();
  assert.strictEqual(snap.schema_version, svc.POLICY_DECISION_SCHEMA_VERSION);
  assert.ok(snap.risk_levels.includes('safe'));
  assert.ok(snap.effects.includes('BLOCK'));
  assert.ok(snap.obligations.includes('HITL_REQUIRED'));
  assert.ok(snap.trace_types.includes('SIGNAL'));
  assert.ok(snap.generated_at);
  console.log('  PASS  8 snapshot generation');
}

function test9KillSwitch() {
  purge();
  process.env.IMPETUS_POLICY_CONTRACT_ENABLED = 'false';
  const svc = require('../services/cognitivePolicyDecisionService');
  assert.strictEqual(svc.isPolicyContractEnabled(), false);
  const sum = svc.getPolicyContractDashboardSummary();
  assert.strictEqual(sum.enabled, false);
  assert.strictEqual(sum.code, 'POLICY_CONTRACT_DISABLED');
  const route = simulatePolicyContractRoute();
  assert.strictEqual(route.status, 403);
  assert.strictEqual(route.body.code, 'POLICY_CONTRACT_DISABLED');
  console.log('  PASS  9 kill switch');
}

function test10DashboardPayload() {
  purge();
  process.env.IMPETUS_POLICY_CONTRACT_ENABLED = 'true';
  const svc = require('../services/cognitivePolicyDecisionService');
  const policy_contract = svc.getPolicyContractDashboardSummary();
  assert.strictEqual(policy_contract.enabled, true);
  assert.ok(policy_contract.schema_version);
  assert.ok(Array.isArray(policy_contract.risk_levels));
  assert.strictEqual(typeof policy_contract.obligation_catalog_count, 'number');
  assert.strictEqual(typeof policy_contract.trace_type_count, 'number');
  assert.strictEqual(typeof policy_contract.effect_catalog_count, 'number');
  assert.ok(['valid', 'invalid', 'schema_drift'].includes(policy_contract.contract_status));
  assert.strictEqual(policy_contract.sample_validation_ok, true);
  console.log('  PASS  10 dashboard payload');
}

function main() {
  console.log('\n=== policyDecisionContractScenarios ===\n');
  try {
    test1CreatePolicyDecision();
    test2NormalizePolicyDecision();
    test3InvalidEnumsFallback();
    test4TraceAppend();
    test5SignalNormalization();
    test6EffectNormalization();
    test7Validator();
    test8SnapshotGeneration();
    test9KillSwitch();
    test10DashboardPayload();
    console.log('\n[POLICY_DECISION_CONTRACT_SCENARIOS] ok\n');
  } finally {
    restoreEnv();
    purge();
  }
}

main();
