'use strict';

/**
 * Rasto mínimo para auditoria de outputs cognitivos (não substitui industrial audit core).
 */

function buildAuditEnvelope({ companyId, userId, correlationId, engineId, payloadSummary }) {
  return {
    version: 1,
    recorded_at: new Date().toISOString(),
    tenant_id: companyId != null ? String(companyId) : null,
    actor_user_id: userId != null ? String(userId) : null,
    correlation_id: correlationId != null ? String(correlationId) : null,
    engine_id: engineId != null ? String(engineId) : 'unknown',
    payload_summary: payloadSummary && typeof payloadSummary === 'object' ? payloadSummary : {},
    classification: 'cognitive_assistive_signal'
  };
}

module.exports = { buildAuditEnvelope };
