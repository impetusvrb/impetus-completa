'use strict';

/**
 * Testes de concorrência — Nexus Billing Engine v4
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
process.env.NEXUS_BILLING_ENGINE_V4 = 'true';
process.env.NEXUS_CREDIT_WALLET = 'true';

const db = require('../db');
const billingEngine = require('../services/nexusBillingEngine');

async function main() {
  const companies = await db.query(`SELECT id FROM companies WHERE active = true LIMIT 1`);
  const companyId = companies.rows[0]?.id;
  const userR = await db.query(
    `SELECT id FROM users WHERE company_id = $1 AND active = true AND deleted_at IS NULL LIMIT 1`,
    [companyId]
  );
  const userId = userR.rows[0]?.id;
  if (!companyId || !userId) {
    console.error('Sem empresa/utilizador');
    process.exit(1);
  }

  await db.query(
    `INSERT INTO nexus_company_wallets (company_id, balance_credits, consumption_paused)
     VALUES ($1, 500, false) ON CONFLICT (company_id) DO UPDATE SET balance_credits = 500, consumption_paused = false`,
    [companyId]
  );

  const startBal = Number((await db.query(`SELECT balance_credits FROM nexus_company_wallets WHERE company_id=$1`, [companyId])).rows[0].balance_credits);
  const requestBase = `conc-${Date.now()}`;
  const parallel = 20;
  const results = await Promise.all(
    Array.from({ length: parallel }, (_, i) =>
      billingEngine.chargeConsumption(
        { companyId, userId, requestId: `${requestBase}-${i}` },
        { servico: 'chat', quantidade: 1, provider: 'openai', model: 'gpt-4o-mini' }
      )
    )
  );
  const okCount = results.filter((r) => r.ok && !r.skipped).length;
  const endBal = Number((await db.query(`SELECT balance_credits FROM nexus_company_wallets WHERE company_id=$1`, [companyId])).rows[0].balance_credits);
  const pass = okCount >= 18 && Math.abs(endBal - (startBal - okCount)) < 0.01;
  console.log({ okCount, startBal, endBal, pass: pass ? 'OK' : 'FAIL' });
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
