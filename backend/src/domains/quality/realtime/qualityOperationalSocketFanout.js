'use strict';

/**
 * Bridge aditivo: após publicar evento operacional qualidade, fan-out para sala company:*
 * (socket.io existente — não altera chatSocket core, apenas emite nomes dedicados).
 */
const flags = require('../runtime/qualityOperationalRuntimeFlags');

/**
 * @param {import('express').Request} req
 * @param {object} p
 */
function fanoutQualityOperationalEvent(req, p) {
  try {
    if (!flags.isQualityRealtimeCollectionEnabled()) return;
    const io = req.app && typeof req.app.get === 'function' ? req.app.get('io') : null;
    const companyId = p.companyId ? String(p.companyId) : '';
    if (!io || !companyId || !/^[0-9a-f-]{36}$/i.test(companyId)) return;

    const actorId = p.user && p.user.id != null ? String(p.user.id) : null;
    const base = {
      company_id: companyId,
      event_name: p.eventName,
      correlation_id: p.correlationId,
      trace_id: p.traceId != null ? String(p.traceId) : p.correlationId,
      workflow_id: p.workflowId != null ? String(p.workflowId) : null,
      actor_id: actorId,
      origin_layer: 'operational',
      emitted_at: new Date().toISOString()
    };
    const payload = p.payload && typeof p.payload === 'object' ? p.payload : {};
    const room = `company:${companyId}`;
    io.to(room).emit('quality_operational_update', { ...base, payload });
    const ev = String(p.eventName || '');
    if (ev.startsWith('quality.inspection.')) {
      io.to(room).emit('quality_inspection_delta', {
        ...base,
        inspection_delta: payload
      });
    }
  } catch (err) {
    console.warn('[qualityOperationalSocketFanout]', err?.message || err);
  }
}

module.exports = {
  fanoutQualityOperationalEvent
};
