'use strict';

function deliverStructuredLog(notification) {
  const entry = {
    ts: new Date().toISOString(),
    component: 'SEC-05',
    notificationId: notification.notificationId,
    severity: notification.severity,
    priority: notification.priority,
    type: notification.notificationType,
    incidentId: notification.incidentId,
    title: notification.title,
    summary: notification.summary,
    groupedEventCount: notification.groupedEventCount
  };
  console.log(JSON.stringify(entry));
  return { channel: 'structured_log', status: 'delivered', at: entry.ts };
}

module.exports = { deliverStructuredLog };
