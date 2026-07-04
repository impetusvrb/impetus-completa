'use strict';

/**
 * SEC-05 — Email adapter (interface desacoplada — sem envio externo).
 */

function createEmailAdapter() {
  return {
    name: 'email',
    enabled: false,
    async send(notification, _recipients) {
      return {
        channel: 'email',
        status: 'skipped',
        reason: 'adapter_not_configured',
        notificationId: notification.notificationId
      };
    }
  };
}

module.exports = { createEmailAdapter };
