'use strict';

/**
 * SEC-05 — Notification Center flags.
 * Default OFF — notification only, zero remediation.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function envInt(name, defaultValue, min, max) {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function isSecurityNotificationCenterEnabled() {
  return envBool('SECURITY_NOTIFICATION_CENTER', false);
}

/** Janela de deduplicação/agrupamento (default 1h). */
function deduplicationWindowMs() {
  return envInt('SECURITY_NOTIFICATION_DEDUP_MS', 3600000, 300000, 24 * 3600000);
}

function maxStoredNotifications() {
  return envInt('SECURITY_NOTIFICATION_MAX_STORED', 500, 50, 5000);
}

function internalWebhookUrl() {
  return process.env.SECURITY_NOTIFICATION_WEBHOOK_URL || null;
}

module.exports = {
  envBool,
  envInt,
  isSecurityNotificationCenterEnabled,
  deduplicationWindowMs,
  maxStoredNotifications,
  internalWebhookUrl
};
