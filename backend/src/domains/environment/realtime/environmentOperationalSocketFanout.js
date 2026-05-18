'use strict';

function fanoutEnvironmentOperationalEvent(req, data) {
  try {
    const io = req.app?.get?.('io');
    if (!io || !data?.companyId) return;
    io.to(`company:${data.companyId}`).emit('environment_operational_update', {
      event_name: data.eventName,
      correlation_id: data.correlationId,
      payload: data.payload || {},
      ts: new Date().toISOString()
    });
  } catch {
    /* realtime must not throw */
  }
}

module.exports = { fanoutEnvironmentOperationalEvent };
