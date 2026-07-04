'use strict';

/**
 * SEC-10 — Notification adapters (preparação only — nunca envia).
 */

function prepareEmailAdapter(pkg) {
  return {
    channel: 'email',
    status: 'SKIPPED',
    sent: false,
    reason: 'Email adapter not configured — SEC-10 preparation only',
    recipient: pkg.operator,
    subject: pkg.incident
      ? `[IMPETUS SEC-10] ${pkg.incident.severity} — ${pkg.incident.classification}`
      : '[IMPETUS SEC-10] Active Defense Alert',
    bodyPreview: pkg.recommendations?.slice(0, 3).map((r) => r.action || r).join('; ') || 'No actions',
    packageId: pkg.operator
  };
}

function prepareWebhookAdapter(pkg) {
  return {
    channel: 'webhook',
    status: 'SKIPPED',
    sent: false,
    reason: 'Webhook adapter not configured — SEC-10 preparation only',
    payloadSize: JSON.stringify(pkg).length
  };
}

function prepareAllAdapters(packages) {
  return packages.map((pkg) => ({
    operator: pkg.operator,
    adapters: [prepareEmailAdapter(pkg), prepareWebhookAdapter(pkg)]
  }));
}

module.exports = { prepareEmailAdapter, prepareWebhookAdapter, prepareAllAdapters };
