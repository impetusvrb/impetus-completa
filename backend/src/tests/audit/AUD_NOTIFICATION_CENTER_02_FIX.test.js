'use strict';

/**
 * AUD-NOTIFICATION-CENTER-02-FIX — testes de conclusão operacional do Notification Center
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');
const FRONTEND_ROOT = path.resolve(BACKEND_ROOT, '..', 'frontend');

function readSrc(rel) {
  const p = path.join(SRC, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

function readFrontend(rel) {
  const p = path.join(FRONTEND_ROOT, rel);
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
  console.log('\n  AUD-NOTIFICATION-CENTER-02-FIX\n');

  const routesSrc = readSrc('routes/appCommunications.js');
  const ncServiceSrc = readSrc('services/notificationCenterService.js');
  const chatSocketSrc = readSrc('socket/chatSocket.js');
  const auditSrc = readSrc('routes/audit.js');
  const umsSrc = readSrc('services/unifiedMessagingService.js');
  const layoutSrc = readFrontend('src/components/Layout.jsx');
  const apiSrc = readFrontend('src/services/api.js');
  const hookSrc = readFrontend('src/hooks/useNotificationCenter.js');

  await test('T1 — notificationCenterService exporta listForUser, getUnreadCount, markAsRead, getAuditStatus', () => {
    assert(fs.existsSync(path.join(SRC, 'services/notificationCenterService.js')));
    const mod = require('../../services/notificationCenterService');
    assert(typeof mod.listForUser === 'function');
    assert(typeof mod.getUnreadCount === 'function');
    assert(typeof mod.markAsRead === 'function');
    assert(typeof mod.getAuditStatus === 'function');
    assert(typeof mod.recordDeliveryAttempt === 'function');
    assert(typeof mod.recordDeliverySuccess === 'function');
  });

  await test('T2 — GET unread-count e PATCH mark-read nas rotas (ordem antes de list)', () => {
    assert(routesSrc.includes("router.get('/notifications/unread-count'"));
    assert(routesSrc.includes("router.patch('/notifications/:id/read'"));
    assert(routesSrc.includes('notificationCenter.getUnreadCount'));
    assert(routesSrc.includes('notificationCenter.markAsRead'));
    assert(routesSrc.includes('notificationCenter.listForUser'));
    const unreadIdx = routesSrc.indexOf('/notifications/unread-count');
    const patchIdx = routesSrc.indexOf('/notifications/:id/read');
    const listIdx = routesSrc.indexOf("router.get('/notifications'");
    assert(unreadIdx > 0 && patchIdx > unreadIdx && listIdx > patchIdx, 'ordem de rotas');
  });

  await test('T3 — Listagem suporta limit, offset e unread filter', () => {
    assert(routesSrc.includes('req.query.offset'));
    assert(routesSrc.includes("req.query.unread === 'true'"));
    assert(ncServiceSrc.includes('unreadOnly'));
    assert(ncServiceSrc.includes('OFFSET'));
  });

  await test('T4 — Socket join user room após autenticação', () => {
    assert(chatSocketSrc.includes('socket.join(`user_${user.id}`)'));
    assert(chatSocketSrc.includes("socket.join('company:' + user.company_id)"));
  });

  await test('T5 — unifiedMessaging regista métricas de entrega', () => {
    assert(umsSrc.includes('recordDeliveryAttempt'));
    assert(umsSrc.includes('recordDeliverySuccess'));
    assert(umsSrc.includes('isSocketEnabled'));
  });

  await test('T6 — Endpoint audit notification-center/status', () => {
    assert(auditSrc.includes('/notification-center/status'));
    assert(auditSrc.includes('requireTenantAdminRole'));
    assert(auditSrc.includes('getAuditStatus'));
  });

  await test('T7 — markAsRead rejeita UUID inválido', async () => {
    const mod = require('../../services/notificationCenterService');
    const r = await mod.markAsRead('not-a-uuid', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
    assert.strictEqual(r.ok, false);
  });

  await test('T8 — Frontend api.js expõe notifications.list/unreadCount/markRead', () => {
    assert(apiSrc.includes('notifications:'));
    assert(apiSrc.includes('unreadCount'));
    assert(apiSrc.includes('markRead'));
    assert(apiSrc.includes('/app-communications/notifications/unread-count'));
  });

  await test('T9 — Layout usa useNotificationCenter (badge dinâmico)', () => {
    assert(layoutSrc.includes('useNotificationCenter'));
    assert(layoutSrc.includes('unreadCount: notificationCount'));
    assert(!layoutSrc.includes('useState(0);\n  const [subscriptionOverdue]'));
    assert(layoutSrc.includes('markNotificationRead'));
    assert(layoutSrc.includes('header-dropdown__notif-list'));
  });

  await test('T10 — Hook escuta app_notification via getSocket', () => {
    assert(hookSrc.includes("socket.on('app_notification'"));
    assert(hookSrc.includes('notifications.unreadCount'));
    assert(hookSrc.includes('notifications.markRead'));
  });

  await test('T11 — getAuditStatus estrutura métricas', async () => {
    const mod = require('../../services/notificationCenterService');
    const st = await mod.getAuditStatus(null);
    assert(typeof st.delivery_attempts === 'number');
    assert(typeof st.delivery_success === 'number');
    assert(typeof st.read_rate === 'number');
    assert(st.user_room_enabled === true);
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
