'use strict';

/**
 * Cognitive Policy Engine — Fase 3 (Policy Signal Abstraction)
 *
 *   npm run test:policy-signals
 *   node src/tests/policySignalAbstractionScenarios.js
 */

const assert = require('assert');

const envSnapshot = { ...process.env };

function purge() {
  try {
    delete require.cache[require.resolve('../services/cognitivePolicySignalService.js')];
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

function test1CreatePolicySignal() {
  purge();
  const svc = require('../services/cognitivePolicySignalService');
  const s = svc.createPolicySignal({
    signal_type: svc.POLICY_UNIVERSAL_SIGNAL_TYPES.CSI,
    value: 62,
    severity: svc.POLICY_SIGNAL_SEVERITY.WARNING,
    source: 'test',
    category: svc.POLICY_SIGNAL_CATEGORIES.STABILITY
  });
  assert.ok(s.signal_id);
  assert.strictEqual(s.signal_type, 'CSI');
  assert.strictEqual(s.severity, 'warning');
  assert.strictEqual(typeof s.normalized_value, 'number');
  console.log('  PASS  1 createPolicySignal');
}

function test2NormalizeSignalValue() {
  purge();
  const svc = require('../services/cognitivePolicySignalService');
  assert.strictEqual(svc.normalizeSignalValue(0.72).normalized, 0.72);
  assert.strictEqual(svc.normalizeSignalValue(72).normalized, 0.72);
  assert.strictEqual(svc.normalizeSignalValue('critical').normalized, 1);
  assert.strictEqual(svc.normalizeSignalValue('warning').normalized, 0.5);
  console.log('  PASS  2 normalizeSignalValue');
}

function test3CsiAdapter() {
  purge();
  const svc = require('../services/cognitivePolicySignalService');
  const s = svc.adaptCsiSignal({ csi: 62, status: 'warning' }, {});
  assert.strictEqual(s.signal_type, 'CSI');
  assert.strictEqual(s.source, 'cognitiveStabilityService');
  assert.ok(Array.isArray(s.metadata.signal_trace));
  assert.ok(s.metadata.signal_trace.some((t) => t.adapter === 'adaptCsiSignal'));
  console.log('  PASS  3 CSI adapter');
}

function test4DriftAdapter() {
  purge();
  const svc = require('../services/cognitivePolicySignalService');
  const s = svc.adaptDriftSignal({ recent_drift_events: 8, high_severity: 1 }, {});
  assert.strictEqual(s.signal_type, 'DRIFT');
  assert.strictEqual(s.source, 'cognitiveDriftService');
  console.log('  PASS  4 drift adapter');
}

function test5Aggregation() {
  purge();
  const svc = require('../services/cognitivePolicySignalService');
  const a = svc.adaptCsiSignal({ csi: 10, status: 'critical' }, {});
  const b = svc.adaptCsiSignal({ csi: 50, status: 'warning' }, {});
  const { signals, summary } = svc.aggregatePolicySignals([a, b]);
  assert.strictEqual(signals.length, 2);
  assert.ok(typeof summary.critical === 'number');
  assert.ok(typeof summary.warning === 'number');
  console.log('  PASS  5 signal aggregation');
}

function test6Validation() {
  purge();
  const svc = require('../services/cognitivePolicySignalService');
  const good = svc.createPolicySignal({
    signal_type: 'CSI',
    value: 1,
    normalized_value: 0.5,
    severity: 'info',
    category: 'stability',
    source: 'x'
  });
  let v = svc.validatePolicySignal(good);
  assert.strictEqual(v.valid, true);
  const bad = { ...good, normalized_value: 2 };
  v = svc.validatePolicySignal(bad);
  assert.strictEqual(v.valid, false);
  console.log('  PASS  6 validation');
}

function test7TraceAppend() {
  purge();
  const svc = require('../services/cognitivePolicySignalService');
  let s = svc.createPolicySignal({ signal_type: 'CSI', value: 1, category: 'stability' });
  const n = (s.metadata && s.metadata.signal_trace) ? s.metadata.signal_trace.length : 0;
  s = svc.appendSignalTrace(s, { adapter: 'manual', source: 'test', transformation: 'noop' });
  assert.ok(s.metadata.signal_trace.length >= n);
  console.log('  PASS  7 trace append');
}

function test8Snapshot() {
  purge();
  const svc = require('../services/cognitivePolicySignalService');
  const snap = svc.generatePolicySignalSnapshot();
  assert.ok(snap.categories.length > 0);
  assert.ok(snap.signal_types.includes('CSI'));
  assert.ok(snap.adapters.includes('adaptCsiSignal'));
  console.log('  PASS  8 snapshot generation');
}

function test9DashboardPayload() {
  purge();
  process.env.IMPETUS_POLICY_SIGNALS_ENABLED = 'true';
  const svc = require('../services/cognitivePolicySignalService');
  const d = svc.getPolicySignalDashboardSummary();
  assert.strictEqual(d.enabled, true);
  assert.ok(d.aggregate_summary);
  assert.ok(Array.isArray(d.normalized_signals_preview));
  assert.strictEqual(typeof d.adapter_count, 'number');
  console.log('  PASS  9 dashboard payload');
}

function test10KillSwitch() {
  purge();
  process.env.IMPETUS_POLICY_SIGNALS_ENABLED = 'false';
  const svc = require('../services/cognitivePolicySignalService');
  assert.strictEqual(svc.isPolicySignalsEnabled(), false);
  const d = svc.getPolicySignalDashboardSummary();
  assert.strictEqual(d.enabled, false);
  assert.strictEqual(d.code, 'POLICY_SIGNALS_DISABLED');
  console.log('  PASS  10 kill switch');
}

function main() {
  console.log('\n=== policySignalAbstractionScenarios ===\n');
  try {
    test1CreatePolicySignal();
    test2NormalizeSignalValue();
    test3CsiAdapter();
    test4DriftAdapter();
    test5Aggregation();
    test6Validation();
    test7TraceAppend();
    test8Snapshot();
    test9DashboardPayload();
    test10KillSwitch();
    console.log('\n[POLICY_SIGNAL_ABSTRACTION_SCENARIOS] ok\n');
  } finally {
    restoreEnv();
    purge();
  }
}

main();
