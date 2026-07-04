'use strict';

/**
 * SEC-05 — SMS adapter (interface desacoplada — Wellington/Gustavo futuro).
 */

function createSmsAdapter() {
  return {
    name: 'sms',
    enabled: false,
    async send(notification, _recipients) {
      return {
        channel: 'sms',
        status: 'skipped',
        reason: 'adapter_not_configured',
        notificationId: notification.notificationId
      };
    }
  };
}

module.exports = { createSmsAdapter };
