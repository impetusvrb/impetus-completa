'use strict';

function buildRolloutAuditEnvelope({ companyId, userId, correlationId, engineId, action, payloadSummary }) {
  return {
      version: 1,
      recorded_at: new Date().toISOString(),
      tenant_id: companyId != null ? String(companyId) : null,
      actor_user_id: userId != null ? String(userId) : null,
      correlation_id: correlationId != null ? String(correlationId) : null,
      engine_id: engineId != null ? String(engineId) : 'rollout',
      action: action != null ? String(action) : 'assess',
      payload_summary: payloadSummary && typeof payloadSummary === 'object' ? payloadSummary : {},
      classification: 'governed_rollout_assistive'
  };
}

module.exports = { buildRolloutAuditEnvelope };
