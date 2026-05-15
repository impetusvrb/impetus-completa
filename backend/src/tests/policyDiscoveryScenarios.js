'use strict';

/**
 * Cognitive Policy Engine — Fase 1 (Policy Discovery Normalization)
 *
 * Execução: npm run test:policy-discovery
 *            node src/tests/policyDiscoveryScenarios.js
 *
 * Não inicia servidor HTTP — valida serviço + contrato do payload admin.
 */

const assert = require('assert');

const envSnapshot = { ...process.env };

function purgeDiscovery() {
  try {
    delete require.cache[require.resolve('../services/cognitivePolicyDiscoveryService.js')];
  } catch (_e) {
    /* ignore */
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

/** Replica a decisão do handler GET /api/admin/learning/policy-discovery (sem middleware). */
function simulatePolicyDiscoveryAdminResponse() {
  const svc = require('../services/cognitivePolicyDiscoveryService');
  if (!svc.isPolicyDiscoveryEnabled()) {
    return { status: 403, body: { ok: false, code: 'POLICY_DISCOVERY_DISABLED' } };
  }
  return { status: 200, body: { ok: true, snapshot: svc.generatePolicyDiscoverySnapshot() } };
}

function test1DiscoveryBasics() {
  process.env.IMPETUS_POLICY_DISCOVERY_ENABLED = 'true';
  purgeDiscovery();
  const svc = require('../services/cognitivePolicyDiscoveryService');
  const d = svc.discoverDistributedPolicies();
  assert.ok(Array.isArray(d.sources) && d.sources.length > 0, 'sources');
  assert.ok(Array.isArray(d.signals) && d.signals.includes('SAFETY'), 'signals');
  assert.ok(Array.isArray(d.effects) && d.effects.includes('BLOCK'), 'effects');
  assert.ok(Array.isArray(d.executors), 'executors');
  assert.strictEqual(Array.isArray(d.capabilities), true);
  assert.strictEqual(d.capabilities.length, 0, 'capabilities empty in discoverDistributedPolicies');
  assert.ok(Array.isArray(d.env_governance) && d.env_governance.length > 0, 'env_governance');
  const ids = d.sources.map((s) => s.id);
  assert.ok(ids.includes('aiSecurityGateway'), 'gateway catalogued');
  assert.ok(ids.includes('cognitiveEventBackboneService'), 'backbone catalogued');
  console.log('  PASS  1 discovery básico');
}

function test2Overlap() {
  process.env.IMPETUS_POLICY_DISCOVERY_ENABLED = 'true';
  purgeDiscovery();
  const svc = require('../services/cognitivePolicyDiscoveryService');
  const { overlaps } = svc.detectPolicyOverlap();
  assert.ok(Array.isArray(overlaps), 'overlaps array');
  const safetyOverlap = overlaps.find((o) => o.signal === 'SAFETY' && o.kind === 'shared_signal');
  assert.ok(safetyOverlap, 'SAFETY shared by multiple modules');
  assert.ok(safetyOverlap.modules.length >= 2, 'SAFETY modules');
  const blockOverlap = overlaps.find((o) => o.effect === 'BLOCK' && o.kind === 'multiple_block_enforcement');
  assert.ok(blockOverlap, 'multiple BLOCK');
  assert.strictEqual(blockOverlap.risk, 'high');
  console.log('  PASS  2 overlap detection');
}

function test3Shadow() {
  purgeDiscovery();
  const svc = require('../services/cognitivePolicyDiscoveryService');
  const { shadow_policies } = svc.detectShadowPolicies();
  assert.ok(Array.isArray(shadow_policies) && shadow_policies.length > 0);
  const tuning = shadow_policies.find((s) => s.module === 'adaptiveTuningService');
  assert.ok(tuning && tuning.type === 'confidence_threshold');
  console.log('  PASS  3 shadow policies');
}

function test4EnvGovernance() {
  purgeDiscovery();
  const svc = require('../services/cognitivePolicyDiscoveryService');
  const envs = svc.discoverPolicyEnvGovernance();
  assert.ok(Array.isArray(envs));
  const keys = envs.map((e) => e.key);
  assert.ok(keys.includes('IMPETUS_CONTEXT_INTEGRITY_ENABLED'));
  assert.ok(keys.includes('IMPETUS_POLICY_DISCOVERY_ENABLED'));
  assert.strictEqual(typeof envs[0].active, 'boolean');
  console.log('  PASS  4 env governance');
}

function test5CapabilityGovernance() {
  purgeDiscovery();
  const svc = require('../services/cognitivePolicyDiscoveryService');
  const { capabilities } = svc.discoverCapabilityGovernance();
  assert.ok(capabilities.some((c) => c.capability === 'requireRole'));
  assert.ok(capabilities.some((c) => c.capability === 'requireTenantAdminRole'));
  assert.ok(capabilities.some((c) => c.capability === 'requireHealthAccess'));
  console.log('  PASS  5 capability governance');
}

function test6KillSwitch() {
  process.env.IMPETUS_POLICY_DISCOVERY_ENABLED = 'false';
  purgeDiscovery();
  const svc = require('../services/cognitivePolicyDiscoveryService');
  assert.strictEqual(svc.isPolicyDiscoveryEnabled(), false);
  const summary = svc.getPolicyDiscoveryDashboardSummary();
  assert.strictEqual(summary.enabled, false);
  assert.strictEqual(summary.code, 'POLICY_DISCOVERY_DISABLED');
  const admin = simulatePolicyDiscoveryAdminResponse();
  assert.strictEqual(admin.status, 403);
  assert.strictEqual(admin.body.code, 'POLICY_DISCOVERY_DISABLED');
  console.log('  PASS  6 kill switch');
}

function test7SnapshotStructure() {
  process.env.IMPETUS_POLICY_DISCOVERY_ENABLED = 'true';
  purgeDiscovery();
  const svc = require('../services/cognitivePolicyDiscoveryService');
  const snap = svc.generatePolicyDiscoverySnapshot();
  assert.ok(snap.generated_at);
  assert.ok(snap.taxonomy && snap.taxonomy.POLICY_SOURCE_TYPES);
  assert.ok(snap.policy_sources && snap.policy_sources.aiSecurityGateway);
  assert.ok(snap.signals && typeof snap.signals === 'object');
  assert.ok(snap.effects && typeof snap.effects === 'object');
  assert.ok(snap.executors && typeof snap.executors === 'object');
  assert.ok(Array.isArray(snap.overlaps));
  assert.ok(Array.isArray(snap.shadow_policies));
  assert.ok(Array.isArray(snap.capabilities));
  assert.ok(Array.isArray(snap.env_governance));
  assert.ok(snap.distributed_summary);
  console.log('  PASS  7 snapshot structure');
}

function test8AdminEndpointContract() {
  process.env.IMPETUS_POLICY_DISCOVERY_ENABLED = 'true';
  purgeDiscovery();
  const res = simulatePolicyDiscoveryAdminResponse();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.ok, true);
  assert.ok(res.body.snapshot && res.body.snapshot.policy_sources);
  console.log('  PASS  8 admin endpoint contract (handler mirror)');
}

function main() {
  console.log('\n=== policyDiscoveryScenarios ===\n');
  try {
    test1DiscoveryBasics();
    test2Overlap();
    test3Shadow();
    test4EnvGovernance();
    test5CapabilityGovernance();
    test6KillSwitch();
    test7SnapshotStructure();
    test8AdminEndpointContract();
    console.log('\n[POLICY_DISCOVERY_SCENARIOS] ok\n');
  } finally {
    restoreEnv();
    purgeDiscovery();
  }
}

main();
