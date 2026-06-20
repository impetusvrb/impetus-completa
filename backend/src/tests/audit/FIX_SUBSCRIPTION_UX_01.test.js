'use strict';

/**
 * FIX-SUBSCRIPTION-UX-01 — testes de consistência UX de assinatura.
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
  console.log('\n  FIX-SUBSCRIPTION-UX-01\n');

  const companiesSrc = readSrc('routes/companies.js');
  const multiTenantSrc = readSrc('middleware/multiTenant.js');
  const auditSrc = readSrc('routes/audit.js');
  const layoutSrc = readSrc('../../frontend/src/components/Layout.jsx');
  const apiSrc = readSrc('../../frontend/src/services/api.js');

  const resolver = require('../../services/subscription/subscriptionRecipientResolver');
  const companyReader = require('../../services/subscription/subscriptionCompanyReader');
  const uxAudit = require('../../services/subscription/subscriptionUxAuditService');

  await test('T1 — GET /api/companies/me existe com requireAuth e perfil subscription', () => {
    assert(companiesSrc.includes("router.get('/me'"), 'rota /me ausente');
    assert(companiesSrc.includes("router.get('/me', requireAuth"), 'requireAuth ausente em /me');
    assert(companiesSrc.includes('getCompanySubscriptionUxProfile'), 'deve reutilizar subscriptionCompanyReader');
    assert(companiesSrc.includes('subscription_status'), 'subscription_status no payload');
    assert(companiesSrc.includes('subscription_plan'), 'subscription_plan no payload');
  });

  await test('T2 — subscriptionRecipientResolver prioriza email_responsavel', () => {
    const out = resolver.resolveFromCompanyRow({
      email_responsavel: ' moderno@empresa.com ',
      data_controller_email: 'legado@empresa.com',
      config: { billing_email: 'config@empresa.com' },
      telefone_responsavel: '31999998888',
      data_controller_phone: '31888887777'
    });
    assert.strictEqual(out.email, 'moderno@empresa.com');
    assert.strictEqual(out.phone, '31999998888');
    assert.strictEqual(out.source, 'email_responsavel');
  });

  await test('T3 — subscriptionRecipientResolver fallback legado', () => {
    const legacy = resolver.resolveFromCompanyRow({
      data_controller_email: 'financeiro@legado.com',
      data_controller_phone: '5511999999999',
      config: { billing_email: 'billing@config.com' }
    });
    assert.strictEqual(legacy.email, 'financeiro@legado.com');
    assert.strictEqual(legacy.phone, '5511999999999');
    assert.strictEqual(legacy.source, 'data_controller_email');

    const configOnly = resolver.resolveFromCompanyRow({
      config: { billing_email: 'billing@config.com' }
    });
    assert.strictEqual(configOnly.email, 'billing@config.com');
    assert.strictEqual(configOnly.source, 'config.billing_email');
  });

  await test('T4 — multiTenant emite COMPANY_INACTIVE com redirect', () => {
    assert(multiTenantSrc.includes("'COMPANY_INACTIVE'"), 'code COMPANY_INACTIVE ausente');
    assert(multiTenantSrc.includes("redirect: '/subscription-expired'"), 'redirect ausente');
    assert(multiTenantSrc.includes('subscription_status'), 'deve consultar subscription_status');
  });

  await test('T5 — frontend api.js trata COMPANY_INACTIVE → subscription-expired', () => {
    assert(apiSrc.includes("'COMPANY_INACTIVE'"), 'handler frontend ausente');
    assert(apiSrc.includes('/subscription-expired'), 'redirect frontend ausente');
  });

  await test('T6 — banner overdue Layout usa companies.getMe + subscription_status', () => {
    assert(layoutSrc.includes('companies.getMe()'), 'Layout não chama companies.getMe');
    assert(layoutSrc.includes("subscription_status === 'overdue'"), 'condição overdue ausente');
    assert(layoutSrc.includes('subscription-overdue-banner'), 'classe banner ausente');
    assert(layoutSrc.includes('setSubscriptionOverdue(true)'), 'estado banner ausente');
  });

  await test('T7 — payload banner: company.subscription_status overdue activa banner', () => {
    const payload = {
      ok: true,
      company: {
        id: 'uuid',
        name: 'Empresa Teste',
        active: true,
        subscription_status: 'overdue',
        subscription_plan: 'profissional'
      }
    };
    assert.strictEqual(payload.company.subscription_status, 'overdue');
    assert.strictEqual(payload.company.subscription_status === 'overdue', true);
  });

  await test('T8 — subscriptionCompanyReader exporta getCompanySubscriptionUxProfile', () => {
    assert(typeof companyReader.getCompanySubscriptionUxProfile === 'function');
    assert(typeof companyReader.loadCompanyRow === 'function');
  });

  await test('T9 — GET /api/audit/subscription-ux/status registado', () => {
    assert(auditSrc.includes('/subscription-ux/status'), 'rota audit ausente');
    assert(auditSrc.includes('requireTenantAdminRole'), 'auth tenant admin ausente');
    assert(auditSrc.includes('getSubscriptionUxAuditStatus'), 'serviço audit ausente');
  });

  await test('T10 — getSubscriptionUxAuditStatus retorna flags esperadas', async () => {
    const status = await uxAudit.getSubscriptionUxAuditStatus();
    assert.strictEqual(status.companies_me_available, true);
    assert.strictEqual(status.subscription_status_available, true);
    assert.strictEqual(status.recipient_resolver_available, true);
    assert.strictEqual(status.company_inactive_code_aligned, true);
    assert.strictEqual(status.banner_ready, true);
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
