#!/usr/bin/env node
/**
 * Job mensal — cobrança de tokens (mês anterior).
 * PM2: cron ou systemd no dia 1 às 08:00:
 *   0 8 1 * * cd /path && node scripts/nexusTokenMonthlyBilling.js
 * Ou: ENABLE_NEXUS_TOKEN_BILLING_CRON=true no processo principal (server.js).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const billingTokenService = require('../src/services/billingTokenService');

async function main() {
  console.log('[NEXUS_CRON] Início', new Date().toISOString());
  const r = await billingTokenService.runMonthlyTokenBilling();
  console.log('[NEXUS_CRON] Resultado', JSON.stringify(r, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error('[NEXUS_CRON]', e);
  process.exit(1);
});
