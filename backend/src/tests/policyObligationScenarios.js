'use strict';

/**
 * Cognitive Policy Engine — Fase 6 (Policy Obligations read-only)
 *
 *   npm run test:policy-obligations
 */

const assert = require('assert');

const envSnapshot = { ...process.env };

function purge() {
  try {
    delete require.cache[require.resolve('../services/cognitivePolicyObligationService.js')];
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

function test1ObligationCreation() {
  purge();
  const obl = require('../services/cognitivePolicyObligationService');
  const o = obl.createPolicyObligation({
    type: obl.POLICY_OBLIGATION_TYPES.HITL_REQUIRED,
    severity: obl.POLICY_OBLIGATION_SEVERITY.HIGH,
    domain: 'SAFETY',
    reason: 'test',
    status: obl.POLICY_OBLIGATION_STATUS.DECLARED
  });
  assert.ok(o.obligation_id);
  assert.strictEqual(o.type, 'HITL_REQUIRED');
  assert.strictEqual(o.status, 'declared');
  console.log('  PASS  1 obligation creation');
}

function test2ObligationComposition() {
  purge();
  const obl = require('../services/cognitivePolicyObligationService');
  const list = obl.composePolicyObligations({
    signals: [{ signal: 'SAFETY', severity: 'critical' }],
    decision: { risk_level: 'critical', effects: [], signals: [] },
    arbitration: { conflicts: [{ type: 'BLOCK_VS_ALLOW' }], winner: { domain: 'SAFETY' } },
    context: { autonomy_degraded: true },
    tenant: { anomaly: true }
  });
  assert.ok(list.some((x) => x.type === 'HITL_REQUIRED'));
  assert.ok(list.some((x) => x.type === 'SECURITY_REVIEW'));
  console.log('  PASS  2 obligation composition');
}

function test3ObligationCorrelations() {
  purge();
  const obl = require('../services/cognitivePolicyObligationService');
  const a = obl.createPolicyObligation({ type: 'HITL_REQUIRED', severity: 'critical', domain: 'SAFETY', reason: 'r' });
  const b = obl.createPolicyObligation({ type: 'AUDIT_REQUIRED', severity: 'high', domain: 'GOVERNANCE', reason: 'r2' });
  const { correlations } = obl.detectObligationCorrelations([a, b]);
  assert.ok(correlations.some((c) => c.type === 'audit_chain'));
  console.log('  PASS  3 obligation correlations');
}

function test4ObligationPriority() {
  purge();
  const obl = require('../services/cognitivePolicyObligationService');
  const low = obl.createPolicyObligation({ type: 'SOFTEN_REQUIRED', severity: 'medium', domain: 'SAFETY', reason: 'x' });
  const high = obl.createPolicyObligation({ type: 'HITL_REQUIRED', severity: 'high', domain: 'SAFETY', reason: 'y' });
  const { dominant_obligation } = obl.resolveObligationPriority([low, high], { winner: { domain: 'SAFETY' } }, {});
  assert.strictEqual(dominant_obligation.type, 'HITL_REQUIRED');
  console.log('  PASS  4 obligation priority');
}

function test5ObligationTrace() {
  purge();
  const obl = require('../services/cognitivePolicyObligationService');
  const o = obl.createPolicyObligation({ type: 'TRACE_REQUIRED', domain: 'INTEGRITY', reason: 'z' });
  const t = obl.appendObligationTrace(o, {
    type: 'OBLIGATION',
    message: 'HITL_REQUIRED declared due to SAFETY dominance'
  });
  assert.ok(t.metadata.obligation_trace.length >= 1);
  console.log('  PASS  5 obligation trace');
}

function test6ObligationReport() {
  purge();
  const obl = require('../services/cognitivePolicyObligationService');
  const r = obl.generateObligationReport();
  assert.ok(Array.isArray(r.obligations));
  assert.ok(r.dominant_obligation);
  assert.ok(Array.isArray(r.correlations));
  assert.ok(typeof r.priority_map === 'object');
  console.log('  PASS  6 obligation report');
}

function test7Validator() {
  purge();
  const obl = require('../services/cognitivePolicyObligationService');
  const r = obl.generateObligationReport();
  const v = obl.validateObligationReport(r);
  assert.strictEqual(v.valid, true);
  console.log('  PASS  7 validator');
}

function test8Snapshot() {
  purge();
  const obl = require('../services/cognitivePolicyObligationService');
  const s = obl.generatePolicyObligationSnapshot();
  assert.ok(s.supported_obligations.includes('HITL_REQUIRED'));
  assert.ok(s.status_types.includes('declared'));
  console.log('  PASS  8 snapshot generation');
}

function test9DashboardPayload() {
  purge();
  process.env.IMPETUS_POLICY_OBLIGATIONS_ENABLED = 'true';
  const obl = require('../services/cognitivePolicyObligationService');
  const d = obl.getPolicyObligationDashboardSummary();
  assert.strictEqual(d.enabled, true);
  assert.ok(d.obligations_declared_count >= 1);
  assert.ok(d.dominant_obligation_type);
  console.log('  PASS  9 dashboard payload');
}

function test10KillSwitch() {
  purge();
  process.env.IMPETUS_POLICY_OBLIGATIONS_ENABLED = 'false';
  const obl = require('../services/cognitivePolicyObligationService');
  assert.strictEqual(obl.isPolicyObligationsEnabled(), false);
  const d = obl.getPolicyObligationDashboardSummary();
  assert.strictEqual(d.enabled, false);
  assert.strictEqual(d.code, 'POLICY_OBLIGATIONS_DISABLED');
  console.log('  PASS  10 kill switch');
}

function main() {
  console.log('\n=== policyObligationScenarios ===\n');
  try {
    test1ObligationCreation();
    test2ObligationComposition();
    test3ObligationCorrelations();
    test4ObligationPriority();
    test5ObligationTrace();
    test6ObligationReport();
    test7Validator();
    test8Snapshot();
    test9DashboardPayload();
    test10KillSwitch();
    console.log('\n[POLICY_OBLIGATION_SCENARIOS] ok\n');
  } finally {
    restoreEnv();
    purge();
  }
}

main();
