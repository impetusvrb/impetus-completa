'use strict';

/**
 * SEC-05 — Channel router (determinístico).
 */

const { deliverConsole } = require('./consoleChannel');
const { deliverStructuredLog } = require('./structuredLogChannel');
const { deliverAudit } = require('./auditChannel');
const { deliverWebhook } = require('./webhookChannel');
const { createEmailAdapter } = require('./adapters/emailAdapter');
const { createPushAdapter } = require('./adapters/pushAdapter');
const { createSmsAdapter } = require('./adapters/smsAdapter');
const metrics = require('../metrics/notificationMetrics');

const externalAdapters = [createEmailAdapter(), createPushAdapter(), createSmsAdapter()];

async function deliverNotification(notification) {
  const results = [];
  const channels = notification.channels || [];

  for (const ch of channels) {
    metrics.increment('delivery_attempts');
    let result;

    switch (ch) {
      case 'console':
        result = deliverConsole(notification);
        break;
      case 'structured_log':
        result = deliverStructuredLog(notification);
        break;
      case 'audit':
        result = deliverAudit(notification);
        break;
      case 'webhook':
        result = await deliverWebhook(notification);
        break;
      default:
        result = { channel: ch, status: 'skipped', reason: 'unknown_channel' };
    }

    if (result.status === 'failed') metrics.increment('delivery_failures');
    results.push(result);
  }

  for (const adapter of externalAdapters) {
    metrics.increment('delivery_attempts');
    const result = await adapter.send(notification, notification.recipients);
    results.push(result);
  }

  const allFailed = results.every((r) => r.status === 'failed');
  const anyDelivered = results.some((r) => r.status === 'delivered' || r.status === 'stored');

  return {
    deliveryStatus: allFailed ? 'failed' : anyDelivered ? 'delivered' : 'pending',
    channelResults: results
  };
}

module.exports = { deliverNotification, externalAdapters };
