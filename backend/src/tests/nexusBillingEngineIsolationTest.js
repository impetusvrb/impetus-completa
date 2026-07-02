'use strict';

/**
 * Testes críticos — Nexus Billing Engine v4 (isolamento multi-tenant)
 * Uso: node backend/src/tests/nexusBillingEngineIsolationTest.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
process.env.NEXUS_BILLING_ENGINE_V4 = 'true';
process.env.NEXUS_CREDIT_WALLET = 'true';

const db = require('../db');
const billingEngine = require('../services/nexusBillingEngine');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  OK ', msg);
  } else {
    failed++;
    console.error(' FAIL', msg);
  }
}

async function main() {
  console.log('Nexus Billing Engine v4 — testes de isolamento\n');

  const companies = await db.query(`SELECT id FROM companies WHERE active = true LIMIT 2`);
  if (companies.rows.length < 1) {
    console.error('Sem empresas activas para teste');
    process.exit(1);
  }
  const companyA = companies.rows[0].id;
  const companyB = companies.rows[1]?.id || companyA;

  const usersA = await db.query(
    `SELECT id, company_id FROM users WHERE company_id = $1 AND active = true AND deleted_at IS NULL LIMIT 1`,
    [companyA]
  );
  const userA = usersA.rows[0];
  assert(userA, 'utilizador empresa A');

  if (companyB !== companyA) {
    const cross = await billingEngine.resolveBillingContext({
      companyId: companyB,
      userId: userA.id,
      requestId: `test-cross-${Date.now()}`
    });
    assert(cross.ok === false && cross.code === 'CROSS_TENANT_USER', 'bloqueia user A em empresa B');
  }

  const missing = await billingEngine.resolveBillingContext({ companyId: companyA });
  assert(missing.ok === false, 'bloqueia sem userId');

  const charge = await billingEngine.chargeConsumption(
    {
      companyId: companyA,
      userId: userA.id,
      requestId: `test-charge-${Date.now()}`
    },
    { servico: 'chat', quantidade: 10, provider: 'openai', model: 'gpt-4o-mini' }
  );
  assert(
    charge.ok === true || charge.code === 'CHARGE_FAILED' || charge.code === 'INSUFFICIENT_BALANCE',
    'charge retorna resultado controlado'
  );

  if (charge.ok) {
    const dup = await billingEngine.chargeConsumption(
      {
        companyId: companyA,
        userId: userA.id,
        requestId: charge.context?.requestId
      },
      { servico: 'chat', quantidade: 10 }
    );
    assert(dup.idempotent === true, 'idempotência por request_id');
  }

  console.log(failed ? `\n${failed} falha(s)` : '\nTodos os testes OK');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
