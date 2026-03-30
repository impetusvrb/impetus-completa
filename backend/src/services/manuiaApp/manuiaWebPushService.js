/**
 * Web Push (VAPID) — envio seguro apenas para dispositivos já registados do utilizador.
 * Requer MANUIA_VAPID_PUBLIC_KEY, MANUIA_VAPID_PRIVATE_KEY e opcional MANUIA_VAPID_SUBJECT (mailto:...).
 */
'use strict';

const webpush = require('web-push');
const repo = require('./manuiaAppRepository');

let vapidApplied = false;

function applyVapidIfNeeded() {
  const pub = (process.env.MANUIA_VAPID_PUBLIC_KEY || '').trim();
  const priv = (process.env.MANUIA_VAPID_PRIVATE_KEY || '').trim();
  const subject = (process.env.MANUIA_VAPID_SUBJECT || 'mailto:support@impetus.local').trim();
  if (!pub || !priv) return false;
  if (!vapidApplied) {
    webpush.setVapidDetails(subject, pub, priv);
    vapidApplied = true;
  }
  return true;
}

function isPushConfigured() {
  return applyVapidIfNeeded();
}

function getPublicVapidKey() {
  const k = (process.env.MANUIA_VAPID_PUBLIC_KEY || '').trim();
  return k || null;
}

/**
 * @param {string} companyId
 * @param {string} userId
 * @param {object} payload — serializado em JSON (título curto no cliente via data)
 */
async function sendJsonToUserDevices(companyId, userId, payload) {
  if (!applyVapidIfNeeded()) {
    return { ok: false, skipped: true, reason: 'MANUIA_VAPID_* não configurado' };
  }
  const devices = await repo.listWebPushSubscriptionsForUser(companyId, userId);
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const results = [];

  for (const d of devices) {
    let sub = d.subscription;
    if (typeof sub === 'string') {
      try {
        sub = JSON.parse(sub);
      } catch {
        sub = null;
      }
    }
    if (!sub || !sub.endpoint) {
      results.push({ id: d.id, ok: false, error: 'subscription_invalid' });
      continue;
    }
    try {
      await webpush.sendNotification(sub, body, { TTL: 120 });
      await repo.touchDeviceLastSeen(companyId, userId, d.id).catch(() => {});
      results.push({ id: d.id, ok: true });
    } catch (e) {
      const code = e.statusCode;
      if (code === 410 || code === 404) {
        await repo.deleteDeviceById(companyId, userId, d.id).catch(() => {});
      }
      results.push({ id: d.id, ok: false, error: e.message || String(e) });
    }
  }

  return { ok: true, sent: results.filter((r) => r.ok).length, results };
}

module.exports = {
  isPushConfigured,
  getPublicVapidKey,
  sendJsonToUserDevices
};
