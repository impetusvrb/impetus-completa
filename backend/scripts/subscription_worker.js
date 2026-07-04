#!/usr/bin/env node
'use strict';

/**
 * Execução manual do ciclo de governança de assinaturas.
 * Substituto operacional do antigo subscription_worker.js (internalizado no server.js).
 *
 * Uso: npm run subscription-worker
 * Cron no processo principal: ENABLE_SUBSCRIPTION_GOVERNANCE_CRON=true
 */

require('../src/config/loadEnv').loadImpetusEnv();

const scheduler = require('../src/services/subscription/subscriptionGovernanceScheduler');

(async () => {
  const result = await scheduler.runSubscriptionGovernanceCycle();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
})().catch((e) => {
  console.error('[subscription-worker]', e.message);
  process.exit(1);
});
