/**
 * CERT-PULSE-03 FASE 9 — Auditoria rastreável do Pulse Cognitivo.
 */
'use strict';

const { randomUUID } = require('crypto');
const db = require('../../db');

function newTraceId() {
  return `pulse-${randomUUID()}`;
}

async function logPulseCognitiveAction(params = {}) {
  const {
    companyId,
    traceId,
    eventType,
    eventSource,
    userId,
    action,
    indicesRecalculated,
    aiParticipated,
    processingMs,
    payload
  } = params;
  if (!companyId || !action) return null;

  try {
    await db.query(
      `
      INSERT INTO pulse_cognitive_audit_log (
        company_id, trace_id, event_type, event_source, user_id, action,
        indices_recalculated, ai_participated, processing_ms, payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
      [
        companyId,
        traceId || newTraceId(),
        eventType || null,
        eventSource || null,
        userId || null,
        action,
        JSON.stringify(indicesRecalculated || []),
        !!aiParticipated,
        processingMs != null ? parseInt(processingMs, 10) : null,
        JSON.stringify(payload || {})
      ]
    );
  } catch (err) {
    console.warn('[pulseCognitive][audit]', err?.message || err);
  }

  try {
    const { logAction } = require('../../middleware/audit');
    await logAction({
      companyId,
      userId: userId || null,
      userName: 'Pulse Cognitivo',
      userRole: 'system',
      action: `pulse_cognitive_${action}`,
      entityType: 'pulse_cognitive',
      entityId: traceId || null,
      description: `Pulse Cognitivo: ${action}${eventType ? ` (${eventType})` : ''}`,
      changes: { trace_id: traceId, event_type: eventType, processing_ms: processingMs },
      severity: 'info',
      success: true
    });
  } catch (_) {
    /* audit legado opcional */
  }

  return traceId;
}

module.exports = { newTraceId, logPulseCognitiveAction };
