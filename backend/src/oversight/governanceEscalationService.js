'use strict';

const { logPhaseG } = require('../explainability/phaseGLogger');
const reviewQueue = require('./governanceReviewQueue');

/**
 * Escalação observacional (sem workflow obrigatório).
 */
function escalateIfNeeded(ctx = {}) {
  const { severity = 'low', type, channel, user_id, trace_id, detail } = ctx;
  if (severity === 'low') return { escalated: false };

  const entry = reviewQueue.enqueueReview({
    severity,
    type: type || 'governance_escalation',
    channel,
    user_id,
    trace_id,
    payload: detail || {}
  });

  logPhaseG('GOVERNANCE_OVERSIGHT_ESCALATION', {
    review_id: entry.id,
    severity,
    channel,
    user_id
  });

  return { escalated: true, review_id: entry.id, entry };
}

module.exports = { escalateIfNeeded };
