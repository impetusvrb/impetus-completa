'use strict';

/**
 * Cognitive Policy Engine — Fase 5 (Policy Arbitration read-only)
 *
 *   npm run test:policy-arbitration
 */

const assert = require('assert');

const envSnapshot = { ...process.env };

function purge() {
  for (const p of ['../services/cognitivePolicyArbitrationService.js']) {
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

function test1ConflictDetection() {
  purge();
  const arb = require('../services/cognitivePolicyArbitrationService');
  const rules = arb.loadMaterializedDefaultRules();
  const extra = arb.createPolicyRule({
    domain: arb.POLICY_DOMAINS.AUTONOMY,
    priority: arb.POLICY_PRIORITY_LEVELS.MEDIUM,
    effect: 'FULL_OUTPUT',
    source: 'demo'
  });
  const { conflicts } = arb.detectPolicyConflicts([...rules, extra]);
  assert.ok(conflicts.some((c) => c.type === 'BLOCK_VS_ALLOW' || c.type === 'SOFTEN_VS_FULL_OUTPUT'));
  console.log('  PASS  1 conflict detection');
}

function test2PriorityResolution() {
  purge();
  const arb = require('../services/cognitivePolicyArbitrationService');
  const rules = arb.loadMaterializedDefaultRules();
  const { winner, ordered } = arb.resolvePolicyPriority(rules);
  assert.ok(winner);
  assert.strictEqual(winner.domain, arb.POLICY_DOMAINS.SAFETY);
  assert.ok(ordered.length >= 2);
  console.log('  PASS  2 priority resolution');
}

function test3OverrideSimulation() {
  purge();
  const arb = require('../services/cognitivePolicyArbitrationService');
  const rules = arb.loadMaterializedDefaultRules();
  const { ordered, winner } = arb.resolvePolicyPriority(rules);
  const { simulated_overrides } = arb.simulatePolicyOverrides(rules, { ordered, winner });
  assert.ok(simulated_overrides.length >= 1);
  assert.ok(simulated_overrides[0].winner);
  assert.ok(simulated_overrides[0].overridden);
  console.log('  PASS  3 override simulation');
}

function test4ArbitrationTrace() {
  purge();
  const arb = require('../services/cognitivePolicyArbitrationService');
  let t = arb.appendArbitrationTrace([], {
    type: 'ARBITRATION',
    message: 'SAFETY outranked AUTONOMY'
  });
  assert.strictEqual(t.length, 1);
  assert.ok(t[0].message.includes('SAFETY'));
  console.log('  PASS  4 arbitration trace');
}

function test5ArbitrationReport() {
  purge();
  const arb = require('../services/cognitivePolicyArbitrationService');
  const report = arb.generatePolicyArbitrationReport();
  assert.ok(Array.isArray(report.conflicts));
  assert.ok(report.winner);
  assert.ok(Array.isArray(report.simulated_overrides));
  assert.ok(typeof report.priority_map === 'object');
  console.log('  PASS  5 arbitration report');
}

function test6Validator() {
  purge();
  const arb = require('../services/cognitivePolicyArbitrationService');
  const report = arb.generatePolicyArbitrationReport();
  const v = arb.validateArbitrationResult(report);
  assert.strictEqual(v.valid, true);
  console.log('  PASS  6 validator');
}

function test7Snapshot() {
  purge();
  const arb = require('../services/cognitivePolicyArbitrationService');
  const s = arb.generatePolicyArbitrationSnapshot();
  assert.ok(s.domains.includes('SAFETY'));
  assert.ok(s.priority_levels.includes('ABSOLUTE'));
  assert.ok(typeof s.rules_loaded === 'number');
  console.log('  PASS  7 snapshot generation');
}

function test8DashboardPayload() {
  purge();
  process.env.IMPETUS_POLICY_ARBITRATION_ENABLED = 'true';
  const arb = require('../services/cognitivePolicyArbitrationService');
  const d = arb.getPolicyArbitrationDashboardSummary();
  assert.strictEqual(d.enabled, true);
  assert.strictEqual(typeof d.conflicts_detected, 'number');
  assert.ok(d.dominant_domain);
  console.log('  PASS  8 dashboard payload');
}

function test9AbsolutePriority() {
  purge();
  const arb = require('../services/cognitivePolicyArbitrationService');
  const rules = arb.loadMaterializedDefaultRules();
  const { winner } = arb.resolvePolicyPriority(rules);
  assert.strictEqual(winner.priority, arb.POLICY_PRIORITY_LEVELS.ABSOLUTE);
  console.log('  PASS  9 ABSOLUTE priority');
}

function test10KillSwitch() {
  purge();
  process.env.IMPETUS_POLICY_ARBITRATION_ENABLED = 'false';
  const arb = require('../services/cognitivePolicyArbitrationService');
  assert.strictEqual(arb.isPolicyArbitrationEnabled(), false);
  const d = arb.getPolicyArbitrationDashboardSummary();
  assert.strictEqual(d.enabled, false);
  assert.strictEqual(d.code, 'POLICY_ARBITRATION_DISABLED');
  console.log('  PASS  10 kill switch');
}

function main() {
  console.log('\n=== policyArbitrationScenarios ===\n');
  try {
    test1ConflictDetection();
    test2PriorityResolution();
    test3OverrideSimulation();
    test4ArbitrationTrace();
    test5ArbitrationReport();
    test6Validator();
    test7Snapshot();
    test8DashboardPayload();
    test9AbsolutePriority();
    test10KillSwitch();
    console.log('\n[POLICY_ARBITRATION_SCENARIOS] ok\n');
  } finally {
    restoreEnv();
    purge();
  }
}

main();
