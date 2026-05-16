'use strict';

const flags = require('../qualityGovernanceRuntimeFlags');
const { publishQualityIndustrialEvent } = require('../../events/qualityEventPublisher');

async function publishGovernanceAssistHook(companyId, userId, payload = {}) {
  if (!flags.isQualityAiAssistanceEnabled()) return { ok: false, skipped: true };
  return publishQualityIndustrialEvent(
    {
      event_name: 'quality.cognitive.operational_hint',
      company_id: companyId,
      correlation_id: payload.correlation_id,
      payload: { layer: 'governance_assist', ...payload, non_authoritative: true }
    },
    { origin_layer: 'governance', intended_audience: 'coordinator', user_id: userId }
  );
}

module.exports = {
  publishGovernanceAssistHook
};
