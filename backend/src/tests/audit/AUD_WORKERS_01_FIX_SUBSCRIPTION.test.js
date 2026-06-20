'use strict';

/**
 * AUD-WORKERS-01-FIX-SUBSCRIPTION — testes de remediação
 * Scheduler interno de governança de assinaturas (checkGracePeriodAndSuspend internalizado).
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
  console.log('\n  AUD-WORKERS-01-FIX-SUBSCRIPTION\n');

  const schedulerPath = path.join(SRC, 'services/subscription/subscriptionGovernanceScheduler.js');
  const serverSrc = readSrc('server.js');
  const schedulerSrc = readSrc('services/subscription/subscriptionGovernanceScheduler.js');
  const auditRouteSrc = readSrc('routes/audit.js');

  await test('T1 — Scheduler existe e exporta startSubscriptionGovernanceCron + runSubscriptionGovernanceCycle', () => {
    assert(fs.existsSync(schedulerPath), 'subscriptionGovernanceScheduler.js ausente');
    const mod = require(schedulerPath);
    assert(typeof mod.startSubscriptionGovernanceCron === 'function');
    assert(typeof mod.runSubscriptionGovernanceCycle === 'function');
    assert(typeof mod.getStatus === 'function');
    assert(typeof mod.isEnabled === 'function');
  });

  await test('T2 — Flag desligada (default) não marca scheduler como enabled', () => {
    const prev = process.env.ENABLE_SUBSCRIPTION_GOVERNANCE_CRON;
    delete process.env.ENABLE_SUBSCRIPTION_GOVERNANCE_CRON;
    delete require.cache[require.resolve(schedulerPath)];
    const mod = require(schedulerPath);
    assert.strictEqual(mod.isEnabled(), false);
    const task = mod.startSubscriptionGovernanceCron();
    assert.strictEqual(task, null);
    const st = mod.getStatus();
    assert.strictEqual(st.enabled, false);
    if (prev !== undefined) process.env.ENABLE_SUBSCRIPTION_GOVERNANCE_CRON = prev;
    delete require.cache[require.resolve(schedulerPath)];
  });

  await test('T3 — Flag ligada agenda execução (cron.schedule 0 * * * *)', () => {
    assert(schedulerSrc.includes("'0 * * * *'"), 'cron horário ausente');
    assert(schedulerSrc.includes('ENABLE_SUBSCRIPTION_GOVERNANCE_CRON'), 'flag ausente no scheduler');
    assert(serverSrc.includes('subscriptionGovernanceScheduler'), 'boot server.js não referencia scheduler');
    assert(serverSrc.includes('startSubscriptionGovernanceCron'), 'boot não chama startSubscriptionGovernanceCron');
  });

  await test('T4 — runSubscriptionGovernanceCycle chama checkGracePeriodAndSuspend', async () => {
    const asaas = require('../../services/asaasService');
    const mod = require(schedulerPath);
    const original = asaas.checkGracePeriodAndSuspend;
    let called = false;
    asaas.checkGracePeriodAndSuspend = async () => {
      called = true;
    };
    try {
      const result = await mod.runSubscriptionGovernanceCycle();
      assert.strictEqual(called, true, 'checkGracePeriodAndSuspend não foi invocado');
      assert.strictEqual(typeof result.ok, 'boolean');
      assert.strictEqual(typeof result.execution_ms, 'number');
    } finally {
      asaas.checkGracePeriodAndSuspend = original;
    }
  });

  await test('T5 — Erro interno no ciclo não propaga (retorna ok:false)', async () => {
    const asaas = require('../../services/asaasService');
    const mod = require(schedulerPath);
    const original = asaas.checkGracePeriodAndSuspend;
    asaas.checkGracePeriodAndSuspend = async () => {
      throw new Error('simulated_subscription_governance_failure');
    };
    try {
      const result = await mod.runSubscriptionGovernanceCycle();
      assert.strictEqual(result.ok, false);
      assert(result.error && result.error.includes('simulated_subscription_governance_failure'));
      const st = mod.getStatus();
      assert(st.last_error && st.last_error.includes('simulated_subscription_governance_failure'));
    } finally {
      asaas.checkGracePeriodAndSuspend = original;
    }
  });

  await test('T6 — Status endpoint e getStatus() expõem campos de auditoria', () => {
    assert(auditRouteSrc.includes('/subscription-governance/status'), 'rota status ausente');
    assert(auditRouteSrc.includes('getStatus'), 'rota não usa getStatus');
    const mod = require(schedulerPath);
    const st = mod.getStatus();
    assert(Object.prototype.hasOwnProperty.call(st, 'enabled'));
    assert(Object.prototype.hasOwnProperty.call(st, 'last_execution'));
    assert(Object.prototype.hasOwnProperty.call(st, 'last_success'));
    assert(Object.prototype.hasOwnProperty.call(st, 'last_error'));
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
