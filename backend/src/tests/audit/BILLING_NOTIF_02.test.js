'use strict';

/**
 * BILLING-NOTIF-02 — testes de notificações progressivas de billing.
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
  console.log('\n  BILLING-NOTIF-02\n');

  const billingPath = path.join(SRC, 'services/subscription/subscriptionBillingNotificationService.js');
  const schedulerSrc = readSrc('services/subscription/subscriptionGovernanceScheduler.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');
  const featureGovSrc = readSrc('services/featureGovernanceService.js');

  delete require.cache[require.resolve(billingPath)];
  const billing = require(billingPath);

  await test('T1 — subscriptionBillingNotificationService exporta processBillingNotifications', () => {
    assert(fs.existsSync(billingPath));
    assert(typeof billing.processBillingNotifications === 'function');
    assert(typeof billing.getAuditStatus === 'function');
    assert(typeof billing.isEnabled === 'function');
    assert.deepStrictEqual(billing.NOTIFICATION_TYPES[3], 'email_day3');
    assert.deepStrictEqual(billing.NOTIFICATION_TYPES[5], 'app_day5');
    assert.deepStrictEqual(billing.NOTIFICATION_TYPES[7], 'nc_day7');
  });

  await test('T2 — feature flag ENABLE_BILLING_NOTIFICATIONS default false', () => {
    const prev = process.env.ENABLE_BILLING_NOTIFICATIONS;
    delete process.env.ENABLE_BILLING_NOTIFICATIONS;
    delete require.cache[require.resolve(billingPath)];
    const mod = require(billingPath);
    assert.strictEqual(mod.isEnabled(), false);
    if (prev !== undefined) process.env.ENABLE_BILLING_NOTIFICATIONS = prev;
    delete require.cache[require.resolve(billingPath)];
  });

  await test('T3 — processBillingNotifications skipped quando flag off', async () => {
    const prev = process.env.ENABLE_BILLING_NOTIFICATIONS;
    process.env.ENABLE_BILLING_NOTIFICATIONS = 'false';
    delete require.cache[require.resolve(billingPath)];
    const mod = require(billingPath);
    const result = await mod.processBillingNotifications();
    assert.strictEqual(result.skipped, true);
    assert.strictEqual(result.enabled, false);
    if (prev !== undefined) process.env.ENABLE_BILLING_NOTIFICATIONS = prev;
    else delete process.env.ENABLE_BILLING_NOTIFICATIONS;
    delete require.cache[require.resolve(billingPath)];
  });

  await test('T4 — daysSinceOverdue calcula dias correctamente', () => {
    const mod = require(billingPath);
    const d = new Date();
    d.setDate(d.getDate() - 5);
    const iso = d.toISOString().split('T')[0];
    assert.strictEqual(mod.daysSinceOverdue(iso), 5);
    assert.strictEqual(mod.daysSinceOverdue(null), 0);
  });

  await test('T5 — dedupe usa tipos email_day3, app_day5, nc_day7', () => {
    const src = readSrc('services/subscription/subscriptionBillingNotificationService.js');
    assert(src.includes('email_day3'));
    assert(src.includes('app_day5'));
    assert(src.includes('nc_day7'));
    assert(src.includes('wasNotificationSent'));
    assert(src.includes('recordNotificationSent'));
    assert(src.includes('subscription_notifications'));
    assert(!src.includes('dashboard_day7'));
    assert(!src.includes('whatsapp_day5'));
  });

  await test('T6 — dia 3 usa emailService.sendOverdueNotificationEmail + recipientResolver', () => {
    const billingSrc = readSrc('services/subscription/subscriptionBillingNotificationService.js');
    const adapterSrc = readSrc('services/governanceAdapters/billingGovernanceAdapter.js');
    assert(billingSrc.includes('billingGovernanceAdapter'));
    assert(billingSrc.includes('_dispatchBillingSend'));
    assert(billingSrc.includes('subscriptionRecipientResolver'));
    assert(billingSrc.includes('billing_notification_email_day3_attempt'));
    assert(billingSrc.includes('billing_notification_email_day3_success'));
    assert(adapterSrc.includes('sendOverdueNotificationEmail'));
  });

  await test('T7 — dia 5 usa appImpetusService sem Z-API/WhatsApp', () => {
    const billingSrc = readSrc('services/subscription/subscriptionBillingNotificationService.js');
    const adapterSrc = readSrc('services/governanceAdapters/billingGovernanceAdapter.js');
    assert(billingSrc.includes('_dispatchBillingSend'));
    assert(billingSrc.includes('billing_notification_app_day5_attempt'));
    assert(billingSrc.includes('billing_notification_app_day5_success'));
    assert(adapterSrc.includes('appImpetusService'));
    assert(adapterSrc.includes("originatedFrom: 'subscription'"));
    assert(!adapterSrc.includes('zapi'));
    assert(!adapterSrc.includes('Z-API'));
  });

  await test('T8 — dia 7 usa unifiedMessagingService + admins hierarchy/tenant_admin', () => {
    const billingSrc = readSrc('services/subscription/subscriptionBillingNotificationService.js');
    const adapterSrc = readSrc('services/governanceAdapters/billingGovernanceAdapter.js');
    assert(billingSrc.includes('hierarchy_level <= 1'));
    assert(billingSrc.includes('tenant_admins'));
    assert(billingSrc.includes('findSupervisorNcRecipients'));
    assert(billingSrc.includes('billing_notification_nc_day7_attempt'));
    assert(billingSrc.includes('billing_notification_nc_day7_success'));
    assert(adapterSrc.includes('unifiedMessagingService'));
    assert(adapterSrc.includes("type: 'warning'"));
  });

  await test('T9 — scheduler integra billing antes de checkGracePeriodAndSuspend', () => {
    assert(schedulerSrc.includes('processBillingNotifications'));
    const fnBody = schedulerSrc.slice(schedulerSrc.indexOf('async function runSubscriptionGovernanceCycle'));
    const billingIdx = fnBody.indexOf('processBillingNotifications');
    const suspendIdx = fnBody.indexOf('await asaasService.checkGracePeriodAndSuspend');
    assert(billingIdx > 0 && suspendIdx > billingIdx, 'billing deve executar antes da suspensão');
  });

  await test('T10 — observability regista métricas billing', () => {
    assert(observabilitySrc.includes('billing_notification_email_day3_attempt'));
    assert(observabilitySrc.includes('billing_notification_nc_day7_success'));
  });

  await test('T11 — featureGovernanceService regista ENABLE_BILLING_NOTIFICATIONS', () => {
    assert(featureGovSrc.includes('ENABLE_BILLING_NOTIFICATIONS'));
  });

  await test('T12 — GET /api/audit/billing-notifications/status', () => {
    assert(auditSrc.includes('/billing-notifications/status'));
    assert(auditSrc.includes('getAuditStatus'));
    assert(auditSrc.includes('requireTenantAdminRole'));
  });

  await test('T13 — getAuditStatus retorna shape esperado', async () => {
    const mod = require(billingPath);
    const status = await mod.getAuditStatus();
    assert.strictEqual(typeof status.enabled, 'boolean');
    assert.strictEqual(typeof status.subscriptions_overdue, 'number');
    assert.strictEqual(typeof status.email_day3_sent, 'number');
    assert.strictEqual(typeof status.app_day5_sent, 'number');
    assert.strictEqual(typeof status.nc_day7_sent, 'number');
    assert.strictEqual(typeof status.dedupe_records, 'number');
  });

  await test('T14 — scheduler cycle inclui billing_notifications em lastMetrics', async () => {
    const schedulerPath = path.join(SRC, 'services/subscription/subscriptionGovernanceScheduler.js');
    const asaas = require('../../services/asaasService');
    const mod = require(schedulerPath);
    const originalSuspend = asaas.checkGracePeriodAndSuspend;
    asaas.checkGracePeriodAndSuspend = async () => {};
    try {
      const result = await mod.runSubscriptionGovernanceCycle();
      assert.strictEqual(result.ok, true);
      assert(result.billing_notifications != null);
      assert.strictEqual(typeof result.billing_notifications.skipped, 'boolean');
    } finally {
      asaas.checkGracePeriodAndSuspend = originalSuspend;
    }
  });

  await test('T15 — processBillingNotifications não invoca suspensão', () => {
    const src = readSrc('services/subscription/subscriptionBillingNotificationService.js');
    assert(!src.includes('await asaasService.checkGracePeriodAndSuspend'));
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
