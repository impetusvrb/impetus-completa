'use strict';

/**
 * EVENT-GOVERNANCE-02 — testes da camada de execução (registry + plano, sem envio).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');

function readSrc(rel) {
  const p = path.join(SRC, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

let passed = 0;
let failed = 0;

async function test(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (e) {
    failed++;
    console.error(`  ❌  ${label}\n       ${e.message}`);
  }
}

(async () => {
  console.log('\n  EVENT-GOVERNANCE-02\n');

  const registryPath = path.join(SRC, 'governance/channelRegistry.js');
  const contractPath = path.join(SRC, 'governance/governanceExecutionContract.js');
  const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
  const govPath = path.join(SRC, 'services/eventGovernanceService.js');
  const dtoPath = path.join(SRC, 'governance/governanceDecisionDto.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');

  delete require.cache[require.resolve(registryPath)];
  delete require.cache[require.resolve(contractPath)];
  delete require.cache[require.resolve(execPath)];
  delete require.cache[require.resolve(govPath)];

  const registry = require(registryPath);
  const { buildExecutionContract } = require(contractPath);
  const execution = require(execPath);
  const governance = require(govPath);
  const { buildGovernanceDecisionDto } = require(dtoPath);

  governance.resetStatsForTests();
  execution.resetStatsForTests();

  await test('T1 — channelRegistry exporta 5 canais core', () => {
    assert(fs.existsSync(registryPath));
    assert.strictEqual(registry.getRegisteredChannelCount(), 5);
    const ids = registry.getRegisteredChannelIds();
    assert(ids.includes('notification_center'));
    assert(ids.includes('app_impetus'));
    assert(ids.includes('email'));
    assert(ids.includes('dashboard'));
    assert(ids.includes('chat'));
    assert.strictEqual(registry.getReadyChannelCount(), 5);
  });

  await test('T2 — cada canal tem executor definido', () => {
    const reg = registry.getChannelRegistry();
    for (const id of registry.getRegisteredChannelIds()) {
      assert(reg[id].executor, `${id} sem executor`);
      assert.strictEqual(reg[id].available, true);
    }
  });

  await test('T3 — buildExecutionContract contrato canónico', () => {
    const c = buildExecutionContract({ channel: 'email' });
    assert.strictEqual(c.channel, 'email');
    assert.strictEqual(c.available, true);
    assert.strictEqual(c.supported, true);
    assert.strictEqual(c.executor, 'emailExecutor');
    assert.strictEqual(c.validationPassed, true);
  });

  await test('T4 — buildExecutionContract canal não registado', () => {
    const c = buildExecutionContract({ channel: 'unknown_channel_xyz' });
    assert.strictEqual(c.supported, false);
    assert.strictEqual(c.available, false);
    assert.strictEqual(c.validationPassed, false);
    assert.strictEqual(c.executor, null);
  });

  await test('T5 — alias operational_alerts → dashboard', () => {
    const resolved = registry.resolveChannelDefinition('operational_alerts');
    assert.strictEqual(resolved.aliasOf, 'dashboard');
    const c = buildExecutionContract({ channel: 'operational_alerts' });
    assert.strictEqual(c.validationPassed, true);
    assert.strictEqual(c.aliasOf, 'dashboard');
  });

  await test('T6 — prepareExecution plano para decisão válida', () => {
    execution.resetStatsForTests();
    const decision = buildGovernanceDecisionDto({
      eventType: 'operational_alert',
      category: 'operational',
      severity: 'high',
      policyId: 'OPERATIONAL_CRITICAL',
      channels: ['notification_center', 'dashboard', 'operational_alerts'],
      escalationLevel: 2,
      recipients: [{ strategy: 'hierarchy_lte_2' }]
    });

    const plan = execution.prepareExecution(decision);
    assert.strictEqual(plan.executable, true);
    assert(plan.channelsReady.includes('notification_center'));
    assert(plan.channelsReady.includes('dashboard'));
    assert(plan.channelsReady.includes('operational_alerts'));
    assert.strictEqual(plan.channelsUnavailable.length, 0);
    assert.strictEqual(plan.executionPlan.length, 3);
    assert(plan.executionPlan.every((step) => step.validationPassed === true));
    assert(plan.executionPlan.every((step) => step.executor));
  });

  await test('T7 — prepareExecution UNMATCHED não executável', () => {
    const decision = buildGovernanceDecisionDto({
      policyId: 'UNMATCHED',
      channels: [],
      severity: 'info'
    });
    const plan = execution.prepareExecution(decision);
    assert.strictEqual(plan.executable, false);
    assert.strictEqual(plan.executionPlan.length, 0);
  });

  await test('T8 — prepareExecution canal desconhecido → unavailable', () => {
    execution.resetStatsForTests();
    const decision = buildGovernanceDecisionDto({
      policyId: 'TEST',
      channels: ['email', 'unknown_xyz'],
      severity: 'high',
      escalationLevel: 1
    });
    const plan = execution.prepareExecution(decision);
    assert.strictEqual(plan.executable, true);
    assert(plan.channelsReady.includes('email'));
    assert(plan.channelsUnavailable.includes('unknown_xyz'));
    const badStep = plan.executionPlan.find((s) => s.channel === 'unknown_xyz');
    assert.strictEqual(badStep.validationPassed, false);
    assert.strictEqual(badStep.reason, 'channel_not_registered');
  });

  await test('T9 — prepareExecution NÃO envia', () => {
    const src = readSrc('services/eventGovernanceExecutionService.js');
    assert(!src.includes('sendToUser'));
    assert(!src.includes('sendMessage'));
    assert(!src.includes('sendOverdueNotificationEmail'));
    assert(!src.includes('notificationCenterService'));
    assert(!src.includes('INSERT INTO'));
  });

  await test('T10 — getChannelCapabilities relatório', () => {
    const caps = execution.getChannelCapabilities();
    assert.strictEqual(caps.length, 5);
    for (const cap of caps) {
      assert(cap.channel);
      assert.strictEqual(cap.available, true);
      assert.strictEqual(cap.executor_defined, true);
    }
    const emailCap = caps.find((c) => c.channel === 'email');
    assert.strictEqual(emailCap.executor, 'emailExecutor');
  });

  await test('T11 — observability métricas execution', () => {
    assert(observabilitySrc.includes('event_governance_execution_plans'));
    assert(observabilitySrc.includes('event_governance_channels_ready'));
    assert(observabilitySrc.includes('event_governance_channels_unavailable'));
  });

  await test('T12 — GET /api/audit/event-governance/execution', () => {
    assert(auditSrc.includes('/event-governance/execution'));
    assert(auditSrc.includes('eventGovernanceExecution'));
    assert(auditSrc.includes('requireTenantAdminRole'));
  });

  await test('T13 — getAuditStatus shape', () => {
    const st = execution.getAuditStatus();
    assert.strictEqual(typeof st.enabled, 'boolean');
    assert.strictEqual(st.registered_channels, 5);
    assert.strictEqual(st.ready_channels, 5);
    assert.strictEqual(typeof st.execution_plans, 'number');
    assert(Array.isArray(st.capabilities));
    assert.strictEqual(st.capabilities.length, 5);
  });

  await test('T14 — evaluateAndPrepare pipeline decisão → plano', () => {
    execution.resetStatsForTests();
    const result = execution.evaluateAndPrepare({
      companyId: '00000000-0000-0000-0000-000000000001',
      eventType: 'subscription_notification_day7',
      category: 'billing',
      severity: 'high',
      sourceModule: 'subscriptionBillingNotificationService'
    });
    assert.strictEqual(result.evaluation.approved, true);
    assert.strictEqual(result.evaluation.policyId, 'BILLING_NC_DAY7');
    assert.strictEqual(result.execution.executable, true);
    assert(result.execution.channelsReady.includes('notification_center'));
    assert(result.execution.decisionRef.policyId, 'BILLING_NC_DAY7');
  });

  await test('T15 — prepareExecution rejeita decision nulo', () => {
    const plan = execution.prepareExecution(null);
    assert.strictEqual(plan.executable, false);
    assert(plan.error);
  });

  await test('T16 — métricas incrementam após prepareExecution', () => {
    execution.resetStatsForTests();
    const decision = buildGovernanceDecisionDto({
      policyId: 'OPERATIONAL_CRITICAL',
      channels: ['notification_center', 'dashboard'],
      severity: 'critical',
      escalationLevel: 2
    });
    execution.prepareExecution(decision);
    const st = execution.getAuditStatus();
    assert(st.execution_plans >= 1);
    assert(st.channels_ready_total >= 2);
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
