'use strict';

/**
 * EVENT-GOVERNANCE-08 — testes migração Billing → Governance.
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
  console.log('\n  EVENT-GOVERNANCE-08-BILLING\n');

  const adapterPath = path.join(SRC, 'services/governanceAdapters/billingGovernanceAdapter.js');
  const billingPath = path.join(SRC, 'services/subscription/subscriptionBillingNotificationService.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_BILLING;
  delete process.env.EVENT_GOVERNANCE_BILLING;

  delete require.cache[require.resolve(adapterPath)];
  const adapter = require(adapterPath);
  adapter.resetStatsForTests();

  await test('T1 — adapter exporta funções principais', () => {
    assert(fs.existsSync(adapterPath));
    assert(typeof adapter.dispatchBillingNotification === 'function');
    assert(typeof adapter.buildGovernanceEvent === 'function');
    assert(typeof adapter.runLegacyDistribution === 'function');
    assert(adapter.BILLING_DAY_CONFIG[3].policyId === 'BILLING_EMAIL_DAY3');
    assert(adapter.BILLING_DAY_CONFIG[5].policyId === 'BILLING_APP_DAY5');
    assert(adapter.BILLING_DAY_CONFIG[7].policyId === 'BILLING_NC_DAY7');
  });

  await test('T2 — buildGovernanceEvent day3', () => {
    const event = adapter.buildGovernanceEvent({
      billingDay: 3,
      companyId: '00000000-0000-0000-0000-000000000001',
      subscriptionId: 'sub-1',
      daysOverdue: 3,
      recipientEmail: 'finance@example.com',
      companyName: 'Empresa Teste'
    });
    assert.strictEqual(event.eventType, 'subscription_notification_day3');
    assert.strictEqual(event.category, 'billing');
    assert.strictEqual(event.sourceModule, 'subscriptionBillingNotificationService');
    assert.strictEqual(event.severity, 'medium');
    assert.strictEqual(event.payload.phase, 'DAY_3_EMAIL');
  });

  await test('T3 — buildGovernanceEvent day5 e day7', () => {
    const day5 = adapter.buildGovernanceEvent({
      billingDay: 5,
      companyId: '00000000-0000-0000-0000-000000000001',
      recipientPhone: '5511999999999',
      message: 'msg day5'
    });
    assert.strictEqual(day5.eventType, 'subscription_notification_day5');
    assert.strictEqual(day5.payload.phase, 'DAY_5_APP');

    const day7 = adapter.buildGovernanceEvent({
      billingDay: 7,
      companyId: '00000000-0000-0000-0000-000000000001',
      recipientUserIds: ['u1', 'u2'],
      message: 'msg day7'
    });
    assert.strictEqual(day7.eventType, 'subscription_notification_day7');
    assert.strictEqual(day7.severity, 'high');
    assert.strictEqual(day7.payload.phase, 'DAY_7_NC');
  });

  await test('T4 — mapPhaseToDay', () => {
    assert.strictEqual(adapter.mapPhaseToDay('DAY_3_EMAIL'), 3);
    assert.strictEqual(adapter.mapPhaseToDay('DAY_5_APP'), 5);
    assert.strictEqual(adapter.mapPhaseToDay('DAY_7_NC'), 7);
  });

  await test('T5 — compareShadow match BILLING_EMAIL_DAY3', () => {
    const legacy = adapter.inferLegacyDistribution({
      billingDay: 3,
      recipientEmail: 'a@b.com'
    });
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'BILLING_EMAIL_DAY3',
        decision: {
          policyId: 'BILLING_EMAIL_DAY3',
          severity: 'medium',
          channels: ['email'],
          escalationLevel: 1
        }
      },
      execution: { channelsReady: ['email'] }
    };
    assert.strictEqual(adapter.compareShadow(legacy, governanceResult).match, true);
  });

  await test('T6 — flag OFF shadow mode', async () => {
    delete process.env.EVENT_GOVERNANCE_BILLING;
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);
    mod.resetStatsForTests();

    const result = await mod.dispatchBillingNotification({
      billingDay: 5,
      companyId: '00000000-0000-0000-0000-000000000001',
      recipientPhone: '5511999999999',
      message: 'shadow billing'
    });

    assert.strictEqual(result.mode, 'shadow');
    assert.strictEqual(result.useLegacy, true);
    assert(result.comparison);

    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T7 — flag ON governance mode', async () => {
    process.env.EVENT_GOVERNANCE_BILLING = 'true';

    const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];

    const execSvc = require(execPath);
    execSvc.executePlan = async () => ({ success: true, channelsExecuted: ['email'] });

    const mod = require(adapterPath);
    const result = await mod.dispatchBillingNotification({
      billingDay: 3,
      companyId: '00000000-0000-0000-0000-000000000001',
      recipientEmail: 'finance@example.com',
      companyName: 'Co',
      daysOverdue: 3
    });

    assert.strictEqual(result.mode, 'governance');
    assert.strictEqual(result.useLegacy, false);

    delete process.env.EVENT_GOVERNANCE_BILLING;
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T8 — fallback em erro governance', async () => {
    const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];

    const execSvc = require(execPath);
    const orig = execSvc.evaluatePrepareAndExecute;
    execSvc.evaluatePrepareAndExecute = async () => {
      throw new Error('billing_governance_simulated_failure');
    };

    const mod = require(adapterPath);
    const result = await mod.dispatchBillingNotification({
      billingDay: 7,
      companyId: '00000000-0000-0000-0000-000000000001',
      recipientUserIds: ['u1'],
      message: 'nc'
    });

    assert.strictEqual(result.mode, 'legacy_fallback');
    assert.strictEqual(result.useLegacy, true);

    execSvc.evaluatePrepareAndExecute = orig;
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T9 — billing service integra adapter sem remover dedupe', () => {
    const src = readSrc('services/subscription/subscriptionBillingNotificationService.js');
    assert(src.includes('billingGovernanceAdapter'));
    assert(src.includes('_dispatchBillingSend'));
    assert(src.includes('wasNotificationSent'));
    assert(src.includes('recordNotificationSent'));
    assert(src.includes('subscription_notifications'));
    assert(src.includes('_sendDay3Email'));
    assert(src.includes('_sendDay5App'));
    assert(src.includes('_sendDay7Nc'));
    assert(src.includes('processBillingNotifications'));
  });

  await test('T10 — dedupe preservado (NOTIFICATION_TYPES)', () => {
    const billing = require(billingPath);
    assert.strictEqual(billing.NOTIFICATION_TYPES[3], 'email_day3');
    assert.strictEqual(billing.NOTIFICATION_TYPES[5], 'app_day5');
    assert.strictEqual(billing.NOTIFICATION_TYPES[7], 'nc_day7');
    assert(typeof billing.wasNotificationSent === 'function');
    assert(typeof billing.recordNotificationSent === 'function');
  });

  await test('T11 — observability métricas billing', () => {
    assert(observabilitySrc.includes('event_governance_billing_events'));
    assert(observabilitySrc.includes('event_governance_billing_migrated'));
    assert(observabilitySrc.includes('event_governance_billing_shadow_total'));
  });

  await test('T12 — GET /api/audit/event-governance/billing', () => {
    assert(auditSrc.includes('/event-governance/billing'));
    assert(auditSrc.includes('billingGovernance'));
  });

  await test('T13 — feature flag registada', () => {
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_BILLING'));
  });

  await test('T14 — isBillingGovernanceEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_BILLING;
    delete require.cache[require.resolve(adapterPath)];
    assert.strictEqual(require(adapterPath).isBillingGovernanceEnabled(), false);
  });

  await test('T15 — divergência detectada day7', () => {
    const legacy = adapter.inferLegacyDistribution({
      billingDay: 7,
      recipientUserIds: ['u1']
    });
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'BILLING_EMAIL_DAY3',
        decision: {
          policyId: 'BILLING_EMAIL_DAY3',
          severity: 'medium',
          channels: ['email'],
          escalationLevel: 1
        }
      },
      execution: { channelsReady: ['email'] }
    };
    assert.strictEqual(adapter.compareShadow(legacy, governanceResult).match, false);
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_BILLING = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_BILLING;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
