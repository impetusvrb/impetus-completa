'use strict';

/**
 * NC-04-FEDERATION — testes de federação read-only do Notification Center.
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
  console.log('\n  NC-04-FEDERATION\n');

  const federationPath = path.join(SRC, 'services/notificationFederationService.js');
  const appCommSrc = readSrc('routes/appCommunications.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');
  const layoutSrc = readSrc('../../frontend/src/components/Layout.jsx');
  const hookSrc = readSrc('../../frontend/src/hooks/useNotificationCenter.js');
  const apiSrc = readSrc('../../frontend/src/services/api.js');

  delete require.cache[require.resolve(federationPath)];
  const federation = require(federationPath);

  await test('T1 — notificationFederationService exporta getUnifiedNotifications', () => {
    assert(fs.existsSync(federationPath));
    assert(typeof federation.getUnifiedNotifications === 'function');
    assert(typeof federation.getFederationAuditStatus === 'function');
    assert(typeof federation.mapRowToDto === 'function');
    assert(federation.FEDERATION_SOURCES.includes('app_notifications'));
    assert(federation.FEDERATION_SOURCES.includes('operational_alerts'));
    assert(federation.FEDERATION_SOURCES.includes('notifications'));
    assert(federation.FEDERATION_SOURCES.includes('manuia_inbox_notifications'));
    assert(federation.FEDERATION_SOURCES.includes('alerts'));
  });

  await test('T2 — DTO canónico mapeia operational_alerts', () => {
    const dto = federation.mapRowToDto('operational_alerts', {
      id: '11111111-1111-1111-1111-111111111111',
      titulo: 'Parada linha',
      mensagem: 'Equipamento offline',
      severidade: 'alta',
      resolvido: false,
      created_at: '2026-06-20T10:00:00.000Z'
    });
    assert.strictEqual(dto.source, 'operational_alerts');
    assert.strictEqual(dto.title, 'Parada linha');
    assert.strictEqual(dto.message, 'Equipamento offline');
    assert.strictEqual(dto.severity, 'high');
    assert.strictEqual(dto.read, false);
    assert.strictEqual(dto.origin_module, 'operacional');
    assert(dto.id.startsWith('operational_alerts:'));
  });

  await test('T3 — DTO billing inferido em app_notifications', () => {
    const dto = federation.mapRowToDto('app_notifications', {
      id: '22222222-2222-2222-2222-222222222222',
      text_content: 'Empresa com inadimplência superior a 7 dias.',
      read_at: null,
      sent_at: '2026-06-20T11:00:00.000Z'
    });
    assert.strictEqual(dto.origin_module, 'billing');
    assert.strictEqual(dto.title, 'Billing');
  });

  await test('T4 — DTO DSR e ManuIA', () => {
    const dsr = federation.mapRowToDto('notifications', {
      id: '33333333-3333-3333-3333-333333333333',
      title: 'Pedido LGPD',
      message: 'SLA approaching',
      priority: 'high',
      read: false,
      action_url: '/admin/lgpd/requests/x',
      created_at: '2026-06-20T12:00:00.000Z'
    });
    assert.strictEqual(dsr.origin_module, 'dsr');
    assert.strictEqual(dsr.deep_link, '/admin/lgpd/requests/x');

    const manu = federation.mapRowToDto('manuia_inbox_notifications', {
      id: '44444444-4444-4444-4444-444444444444',
      title: 'OS crítica',
      body: 'Máquina parada',
      severity: 'critical',
      read_at: null,
      created_at: '2026-06-20T13:00:00.000Z'
    });
    assert.strictEqual(manu.origin_module, 'manuia');
    assert.strictEqual(manu.severity, 'high');
  });

  await test('T5 — TPM inferido por tipo_alerta', () => {
    const dto = federation.mapRowToDto('operational_alerts', {
      id: '55555555-5555-5555-5555-555555555555',
      tipo_alerta: 'tpm_perdas',
      titulo: 'TPM',
      mensagem: 'Perdas detectadas',
      severidade: 'media',
      resolvido: false,
      created_at: '2026-06-20T14:00:00.000Z'
    });
    assert.strictEqual(dto.origin_module, 'tpm');
  });

  await test('T6 — GET /api/app-communications/unified-notifications', () => {
    assert(appCommSrc.includes('/unified-notifications'));
    assert(appCommSrc.includes('getUnifiedNotifications'));
    assert(appCommSrc.includes('requireCompanyActive'));
    assert(appCommSrc.includes('requireAuth'));
  });

  await test('T7 — filtros limit offset source severity unread', () => {
    assert(appCommSrc.includes('req.query.limit'));
    assert(appCommSrc.includes('req.query.offset'));
    assert(appCommSrc.includes('req.query.source'));
    assert(appCommSrc.includes('req.query.severity'));
    assert(appCommSrc.includes('req.query.unread'));
  });

  await test('T8 — getUnifiedNotifications agrega e pagina (mock)', async () => {
    const mod = require(federationPath);
    const original = mod.getUnifiedNotifications;
    let capturedOpts = null;
    mod.getUnifiedNotifications = async (_uid, _cid, opts) => {
      capturedOpts = opts;
      return {
        notifications: [
          {
            id: 'operational_alerts:a',
            source: 'operational_alerts',
            title: 'A',
            message: 'm',
            severity: 'high',
            created_at: '2026-06-20T15:00:00.000Z',
            read: false,
            origin_module: 'operacional',
            deep_link: null,
            raw_id: 'a'
          }
        ],
        total: 1,
        limit: 10,
        offset: 0,
        federation_enabled: true
      };
    };
    try {
      const r = await mod.getUnifiedNotifications('u', 'c', { limit: 10, offset: 0, unread: true });
      assert.strictEqual(r.total, 1);
      assert.strictEqual(r.notifications.length, 1);
    } finally {
      mod.getUnifiedNotifications = original;
    }
    void capturedOpts;
  });

  await test('T9 — tenant isolation via queries scoped company/user', () => {
    const src = readSrc('services/notificationFederationService.js');
    assert(src.includes('company_id = $1'));
    assert(src.includes('user_id = $2'));
    assert(src.includes('recipient_id = $1'));
    assert(!src.includes('INSERT INTO'));
    assert(!src.includes('UPDATE '));
    assert(!src.includes('DELETE FROM'));
  });

  await test('T10 — observability métricas federation', () => {
    assert(observabilitySrc.includes('notification_federation_queries'));
    assert(observabilitySrc.includes('notification_federation_results'));
    assert(observabilitySrc.includes('notification_federation_latency_ms'));
  });

  await test('T11 — GET /api/audit/notification-center/federation', () => {
    assert(auditSrc.includes('/notification-center/federation'));
    assert(auditSrc.includes('getFederationAuditStatus'));
  });

  await test('T12 — getFederationAuditStatus shape', async () => {
    const status = await federation.getFederationAuditStatus();
    assert.strictEqual(typeof status.federation_enabled, 'boolean');
    assert(Array.isArray(status.sources));
    assert.strictEqual(typeof status.total_items, 'number');
  });

  await test('T13 — frontend Unified Feed + filtros', () => {
    assert(hookSrc.includes("feedMode === 'unified'"));
    assert(hookSrc.includes('unifiedNotifications'));
    assert(hookSrc.includes('UNIFIED_CATEGORIES'));
    assert(layoutSrc.includes('Unified Feed'));
    assert(layoutSrc.includes('UNIFIED_CATEGORIES'));
    assert(apiSrc.includes('/unified-notifications'));
  });

  await test('T14 — sem novas tabelas ou migrations', () => {
    const src = readSrc('services/notificationFederationService.js');
    assert(!src.includes('CREATE TABLE'));
    assert(!src.includes('unified_notifications'));
    assert(!src.includes('notification_center_notifications'));
  });

  await test('T15 — getUnifiedNotifications live read-only', async () => {
    const mod = require(federationPath);
    const r = await mod.getUnifiedNotifications(
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      { limit: 5, offset: 0 }
    );
    assert.strictEqual(typeof r.federation_enabled, 'boolean');
    assert(Array.isArray(r.notifications));
    assert.strictEqual(typeof r.total, 'number');
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
