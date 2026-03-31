/**
 * ManuIA App de extensão — API sob /api/manutencao-ia/app
 * Preferências, inbox, dispositivos, resumo dashboard (perfil manutenção).
 */
'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireCompanyActive } = require('../middleware/multiTenant');
const { resolveDashboardProfile } = require('../services/dashboardProfileResolver');
const repo = require('../services/manuiaApp/manuiaAppRepository');
const decision = require('../services/manuiaApp/manuiaAlertDecisionService');
const aiSummary = require('../services/manuiaApp/manuiaAiSummaryService');
const webPush = require('../services/manuiaApp/manuiaWebPushService');
const ingest = require('../services/manuiaApp/manuiaInboxIngestService');
const eventDispatch = require('../services/manuiaApp/manuiaEventDispatchService');
const db = require('../db');

const MAINTENANCE_PROFILES = new Set([
  'technician_maintenance',
  'supervisor_maintenance',
  'coordinator_maintenance',
  'manager_maintenance'
]);

function requireMaintenanceProfile(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Não autenticado' });
  }
  const profile = resolveDashboardProfile(user);
  const profileStr = String(profile || '');
  const byCode = MAINTENANCE_PROFILES.has(profile);
  const byName = profileStr.includes('maintenance') || profileStr.includes('manutencao');
  if (!byCode && !byName) {
    return res.status(403).json({
      ok: false,
      error: 'Acesso restrito à equipe de manutenção',
      code: 'MAINTENANCE_PROFILE_REQUIRED'
    });
  }
  next();
}

const guard = [requireAuth, requireCompanyActive, requireMaintenanceProfile];

/** Chave pública VAPID para o browser subscrever Web Push (sem segredos). */
router.get('/push/vapid-public-key', (req, res) => {
  const key = webPush.getPublicVapidKey();
  if (!key) {
    return res.status(503).json({
      ok: false,
      error: 'Web Push não configurado. Defina MANUIA_VAPID_PUBLIC_KEY e MANUIA_VAPID_PRIVATE_KEY no servidor.'
    });
  }
  res.json({ ok: true, publicKey: key });
});

router.get('/preferences', ...guard, async (req, res) => {
  try {
    let row = await repo.getPreferences(req.user.company_id, req.user.id);
    if (!row) {
      row = await repo.upsertPreferences(req.user.company_id, req.user.id, {});
    }
    res.json({ ok: true, data: row });
  } catch (e) {
    if (e.message?.includes('does not exist')) {
      return res.json({ ok: true, data: null, migration_required: true });
    }
    console.error('[MANUIA_APP_PREFS]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/preferences', ...guard, express.json(), async (req, res) => {
  try {
    const row = await repo.upsertPreferences(req.user.company_id, req.user.id, req.body || {});
    res.json({ ok: true, data: row });
  } catch (e) {
    console.error('[MANUIA_APP_PREFS_PUT]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/devices', ...guard, express.json({ limit: '64kb' }), async (req, res) => {
  try {
    const sub = req.body?.subscription || req.body;
    if (!sub || typeof sub !== 'object') {
      return res.status(400).json({ ok: false, error: 'subscription (objeto Web Push) obrigatório' });
    }
    const row = await repo.insertDevice(req.user.company_id, req.user.id, {
      platform: req.body.platform || 'web',
      subscription: sub,
      device_label: req.body.device_label,
      user_agent: req.get('user-agent')
    });
    res.status(201).json({ ok: true, data: row });
  } catch (e) {
    console.error('[MANUIA_APP_DEVICE]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/inbox', ...guard, async (req, res) => {
  try {
    const items = await repo.listInbox(req.user.company_id, req.user.id, {
      limit: req.query.limit,
      alert_level: req.query.alert_level,
      attendance_status: req.query.attendance_status,
      unread_only: req.query.unread_only === '1' || req.query.unread_only === 'true'
    });
    res.json({ ok: true, items });
  } catch (e) {
    if (e.message?.includes('does not exist')) {
      return res.json({ ok: true, items: [], migration_required: true });
    }
    console.error('[MANUIA_APP_INBOX]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/inbox/:id', ...guard, async (req, res) => {
  try {
    const row = await repo.getInboxById(req.user.company_id, req.user.id, req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'Notificação não encontrada' });
    res.json({ ok: true, data: row });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.patch('/inbox/:id/attendance', ...guard, express.json(), async (req, res) => {
  try {
    const status = req.body?.attendance_status || req.body?.status;
    const row = await repo.updateInboxAttendance(
      req.user.company_id,
      req.user.id,
      req.params.id,
      status
    );
    if (!row) return res.status(404).json({ ok: false, error: 'Notificação não encontrada' });
    res.json({ ok: true, data: row });
  } catch (e) {
    if (String(e.message || '').includes('does not exist')) {
      return res.status(503).json({ ok: false, migration_required: true, error: 'Execute npm run migrate' });
    }
    res.status(400).json({ ok: false, error: e.message });
  }
});

/**
 * Escalação manual: marca o alerta e notifica supervisores de manutenção (se MANUIA_EVENT_DISPATCH_ENABLED).
 */
router.post('/inbox/:id/escalate', ...guard, express.json(), async (req, res) => {
  try {
    if (String(process.env.MANUIA_MANUAL_ESCALATION_ENABLED || '').toLowerCase() !== 'true') {
      return res.status(403).json({
        ok: false,
        error: 'Escalação manual desativada. Defina MANUIA_MANUAL_ESCALATION_ENABLED=true.'
      });
    }
    const row = await repo.getInboxById(req.user.company_id, req.user.id, req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'Notificação não encontrada' });
    await repo.updateInboxAttendance(req.user.company_id, req.user.id, req.params.id, 'escalated');
    const notify = await eventDispatch.notifySupervisorsOnManualEscalation({
      companyId: req.user.company_id,
      originUserId: req.user.id,
      inboxNotificationId: row.id,
      title: row.title,
      body: row.body || '',
      note: (req.body?.note || '').slice(0, 500)
    });
    const updated = await repo.getInboxById(req.user.company_id, req.user.id, req.params.id);
    res.json({ ok: true, data: updated, escalation: notify });
  } catch (e) {
    if (String(e.message || '').includes('does not exist')) {
      return res.status(503).json({ ok: false, migration_required: true, error: 'Execute npm run migrate' });
    }
    console.error('[MANUIA_ESCALATE]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/inbox/:id/ack', ...guard, async (req, res) => {
  try {
    const row = await repo.acknowledgeInbox(req.user.company_id, req.user.id, req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'Notificação não encontrada' });
    res.json({ ok: true, data: row });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/inbox/:id/read', ...guard, async (req, res) => {
  try {
    const row = await repo.markRead(req.user.company_id, req.user.id, req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'Notificação não encontrada' });
    res.json({ ok: true, data: row });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/work-orders', ...guard, async (req, res) => {
  try {
    const items = await repo.listMyWorkOrders(req.user.company_id, req.user.id, req.query.limit);
    res.json({ ok: true, items });
  } catch (e) {
    if (e.message?.includes('does not exist')) {
      return res.json({ ok: true, items: [] });
    }
    console.error('[MANUIA_APP_WO]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/dashboard', ...guard, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const [prefs, inbox, wo, machines, onCall] = await Promise.all([
      repo.getPreferences(companyId, userId).catch(() => null),
      repo.listInbox(companyId, userId, 15).catch(() => []),
      repo.listMyWorkOrders(companyId, userId, 10).catch(() => []),
      db
        .query(
          `SELECT COUNT(*)::int AS c FROM manuia_machines WHERE company_id = $1 AND active = true`,
          [companyId]
        )
        .catch(() => ({ rows: [{ c: 0 }] })),
      repo.isUserOnCallNow(companyId, userId, new Date()).catch(() => false)
    ]);

    const unread = (inbox || []).filter((n) => !n.read_at).length;
    const openWo = (wo || []).filter((w) =>
      ['open', 'in_progress', 'waiting_parts', 'waiting_support'].includes(w.status)
    ).length;

    res.json({
      ok: true,
      summary: {
        machines_count: machines.rows?.[0]?.c ?? 0,
        inbox_unread: unread,
        work_orders_open: openWo,
        on_call: onCall
      },
      preferences: prefs,
      recent_inbox: inbox,
      recent_work_orders: wo
    });
  } catch (e) {
    console.error('[MANUIA_APP_DASH]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Simula decisão de alerta (motor de regras) — não persiste; útil para testes e futura IA supervisora */
router.post('/decision/preview', ...guard, express.json(), async (req, res) => {
  try {
    let prefs = await repo.getPreferences(req.user.company_id, req.user.id);
    if (!prefs) prefs = {};
    const userOnCall =
      !!prefs.on_call ||
      (await repo.isUserOnCallNow(req.user.company_id, req.user.id, new Date()));
    const result = decision.decideAlertDelivery({
      eventType: req.body.eventType || 'generic',
      severity: req.body.severity || 'medium',
      prefs,
      userOnCall
    });
    res.json({ ok: true, data: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/notification-preview', ...guard, express.json(), async (req, res) => {
  try {
    const copy = await aiSummary.buildNotificationCopyAsync(req.body || {}, {
      companyId: req.user.company_id
    });
    res.json({ ok: true, data: copy });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Teste de Web Push apenas para dispositivos registados do próprio utilizador. */
router.post('/push/test', ...guard, express.json(), async (req, res) => {
  try {
    if (String(process.env.MANUIA_PUSH_TEST_ENABLED || '').toLowerCase() !== 'true') {
      return res.status(403).json({
        ok: false,
        error: 'Teste de push desativado. Defina MANUIA_PUSH_TEST_ENABLED=true no servidor.'
      });
    }
    if (!webPush.isPushConfigured()) {
      return res.status(503).json({ ok: false, error: 'VAPID não configurado' });
    }
    const title = (req.body?.title || 'ManuIA — teste').slice(0, 120);
    const body = (req.body?.body || 'Notificação de teste.').slice(0, 500);
    const r = await webPush.sendJsonToUserDevices(req.user.company_id, req.user.id, {
      title,
      body,
      tag: 'manuia-test',
      data: { test: true }
    });
    res.json({ ok: true, ...r });
  } catch (e) {
    console.error('[MANUIA_PUSH_TEST]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Cria uma notificação de teste na inbox (valida ingest + regras). */
router.post('/notifications/simulate-ingest', ...guard, express.json(), async (req, res) => {
  try {
    if (String(process.env.MANUIA_SIMULATE_INGEST_ENABLED || '').toLowerCase() !== 'true') {
      return res.status(403).json({
        ok: false,
        error: 'Simulação desativada. Defina MANUIA_SIMULATE_INGEST_ENABLED=true (homologação).'
      });
    }
    const out = await ingest.ingestForUser({
      companyId: req.user.company_id,
      userId: req.user.id,
      eventType: req.body?.eventType || 'generic',
      severity: req.body?.severity || 'medium',
      title: (req.body?.title || 'Teste de ingestão ManuIA').slice(0, 500),
      body: req.body?.body || null,
      payload: typeof req.body?.payload === 'object' ? req.body.payload : {},
      requiresAck: !!req.body?.requiresAck
    });
    res.json({ ok: true, ...out });
  } catch (e) {
    console.error('[MANUIA_SIMULATE_INGEST]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/on-call', ...guard, async (req, res) => {
  try {
    const rows = await repo.listOnCallSlotsForUser(req.user.company_id, req.user.id);
    res.json({ ok: true, items: rows });
  } catch (e) {
    if (e.message?.includes('does not exist')) {
      return res.json({ ok: true, items: [], migration_required: true });
    }
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/on-call', ...guard, express.json(), async (req, res) => {
  try {
    const { starts_at, ends_at, label, active } = req.body || {};
    if (!starts_at || !ends_at) {
      return res.status(400).json({ ok: false, error: 'starts_at e ends_at são obrigatórios (ISO 8601)' });
    }
    const row = await repo.insertOnCallSlot(req.user.company_id, req.user.id, {
      starts_at,
      ends_at,
      label,
      active
    });
    res.status(201).json({ ok: true, data: row });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/on-call/:id', ...guard, express.json(), async (req, res) => {
  try {
    const row = await repo.updateOnCallSlot(req.user.company_id, req.user.id, req.params.id, req.body || {});
    if (!row) return res.status(404).json({ ok: false, error: 'Slot não encontrado' });
    res.json({ ok: true, data: row });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete('/on-call/:id', ...guard, async (req, res) => {
  try {
    const row = await repo.deleteOnCallSlot(req.user.company_id, req.user.id, req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'Slot não encontrado' });
    res.json({ ok: true, deleted: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
