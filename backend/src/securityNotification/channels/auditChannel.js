'use strict';

function deliverAudit(notification) {
  return {
    channel: 'audit',
    status: 'stored',
    at: new Date().toISOString(),
    notificationId: notification.notificationId
  };
}

module.exports = { deliverAudit };
