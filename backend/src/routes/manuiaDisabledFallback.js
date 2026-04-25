'use strict';

/**
 * Quando ENABLE_MANUIA=false, responde a /api/manutencao-ia/* com JSON previsível
 * (ok: true, manuia_disabled) — evita 404/500 no cliente. Não requer autenticação
 * (o módulo está desligado; mensagem informativa).
 */
const express = require('express');

const router = express.Router();

const MSG_PT =
  'O módulo ManuIA está desativado neste servidor (ENABLE_MANUIA=false). Nenhuma operação de manutenção assistida foi executada.';

const CODE = 'MANUIA_DISABLED';

const BASE = {
  ok: true,
  manuia_enabled: false,
  manuia_disabled: true,
  code: CODE,
  message: MSG_PT
};

/**
 * @param {string} path
 * @param {string} method
 * @returns {Record<string, unknown>}
 */
function getManuiaDisabledPayload(path, method) {
  const p = (path || '/').split('?')[0] || '/';
  const m = String(method || 'GET').toUpperCase();

  if (p === '/app/push/vapid-public-key' || p.startsWith('/app/push/vapid')) {
    return { ...BASE, publicKey: null, skipped: true };
  }
  if (p === '/app/dashboard' || p.startsWith('/app/dashboard/')) {
    return {
      ...BASE,
      summary: {
        machines_count: 0,
        inbox_unread: 0,
        work_orders_open: 0,
        on_call: false
      },
      preferences: null,
      recent_inbox: [],
      recent_work_orders: []
    };
  }
  if (p === '/app/inbox' || p === '/app/inbox/') {
    return { ...BASE, items: [] };
  }
  if (p.startsWith('/app/inbox/')) {
    return { ...BASE, data: null, item: null };
  }
  if (p.startsWith('/app/work-orders')) {
    return { ...BASE, items: [] };
  }
  if (p.startsWith('/app/preferences')) {
    return { ...BASE, data: null };
  }
  if (p.startsWith('/app/on-call')) {
    return { ...BASE, slots: [] };
  }
  if (p.startsWith('/app/decision/') || p.startsWith('/app/notification-preview')) {
    return { ...BASE, data: null, skipped: true };
  }
  if (p.startsWith('/app/notifications/') || p === '/app/push/test') {
    return { ...BASE, skipped: true, sent: 0, delivered: 0 };
  }
  if (p.startsWith('/app/devices')) {
    return { ...BASE, data: null, skipped: true };
  }

  if (p === '/machines' || p === '/machines/') {
    return { ...BASE, machines: [] };
  }
  if (p.includes('/diagnostic') && p.startsWith('/machines/')) {
    return {
      ...BASE,
      diagnostic: { sensors: [], events: [] },
      machine: null
    };
  }
  if (p.startsWith('/machines/')) {
    return { ...BASE, machine: null, not_available: true };
  }

  if (p.startsWith('/sensors')) {
    return { ...BASE, sensors: [] };
  }

  if (p === '/sessions' || p === '/sessions/') {
    if (m === 'POST') {
      return { ...BASE, session: null, skipped: true };
    }
    return { ...BASE, sessions: [] };
  }

  if (p.startsWith('/emergency-events')) {
    return { ...BASE, events: [] };
  }

  if (p.startsWith('/research-equipment/recent')) {
    return { ...BASE, items: [] };
  }
  if (p.startsWith('/research-equipment')) {
    return { ...BASE, research: { skipped: true, reason: CODE } };
  }

  if (p.startsWith('/live-assistance/chat')) {
    return {
      ...BASE,
      reply: {
        role: 'assistant',
        content: MSG_PT
      }
    };
  }
  if (p.startsWith('/live-assistance/analyze-frame')) {
    return {
      ...BASE,
      detection: null,
      dossier: null,
      skipped: true
    };
  }
  if (p.startsWith('/live-assistance/save-session')) {
    return { ...BASE, saved: false, skipped: true };
  }

  if (p.startsWith('/conclude-session')) {
    return { ...BASE, work_order_id: null, machine_id: null, skipped: true };
  }

  if (p.startsWith('/health')) {
    return { ...BASE, module: 'manuia', version: '1.0.0', active: false, healthy: true };
  }

  return { ...BASE };
}

router.use((req, res) => {
  res.set('X-ManuIA-Status', 'disabled');
  res.set('X-ManuIA-Code', CODE);
  const body = getManuiaDisabledPayload(req.path, req.method);
  const m = String(req.method || 'GET').toUpperCase();
  if (m === 'POST' && req.path && /^\/sessions\/?$/.test(req.path)) {
    return res.status(201).json(body);
  }
  res.status(200).json(body);
});

module.exports = router;
module.exports.getManuiaDisabledPayload = getManuiaDisabledPayload;
module.exports.MANUIA_DISABLED_MESSAGE = MSG_PT;
module.exports.MANUIA_DISABLED_CODE = CODE;
