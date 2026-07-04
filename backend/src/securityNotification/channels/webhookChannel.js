'use strict';

const flags = require('../config/securityNotificationFlags');

async function deliverWebhook(notification) {
  const url = flags.internalWebhookUrl();
  if (!url) {
    return {
      channel: 'webhook',
      status: 'skipped',
      reason: 'SECURITY_NOTIFICATION_WEBHOOK_URL not configured'
    };
  }

  try {
    const http = url.startsWith('https') ? require('https') : require('http');
    const payload = JSON.stringify({
      source: 'SEC-05',
      notificationId: notification.notificationId,
      severity: notification.severity,
      title: notification.title,
      summary: notification.summary,
      incidentId: notification.incidentId,
      commandCenter: notification.commandCenter
    });

    await new Promise((resolve, reject) => {
      const req = http.request(
        url,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
        (res) => {
          res.resume();
          if (res.statusCode >= 200 && res.statusCode < 300) resolve();
          else reject(new Error(`webhook status ${res.statusCode}`));
        }
      );
      req.on('error', reject);
      req.setTimeout(5000, () => req.destroy(new Error('webhook timeout')));
      req.write(payload);
      req.end();
    });

    return { channel: 'webhook', status: 'delivered', at: new Date().toISOString() };
  } catch (e) {
    return { channel: 'webhook', status: 'failed', error: e?.message || String(e) };
  }
}

module.exports = { deliverWebhook };
