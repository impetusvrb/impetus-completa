'use strict';

/**
 * SEC-05 — Push adapter (interface desacoplada).
 */

function createPushAdapter() {
  return {
    name: 'push',
    enabled: false,
    async send(notification, _recipients) {
      return {
        channel: 'push',
        status: 'skipped',
        reason: 'adapter_not_configured',
        notificationId: notification.notificationId
      };
    }
  };
}

module.exports = { createPushAdapter };
