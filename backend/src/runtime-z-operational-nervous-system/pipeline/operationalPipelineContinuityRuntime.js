'use strict';

const store = require('../_core/sz4TenantStore');

function buildContinuity(tenantId, threadId) {
  const ctx = store.getThreadContext(tenantId, threadId);
  if (!ctx) return { continuation_score: 0, inherited: false };
  return {
    continuation_score: ctx.entities ? Math.min(1, Object.keys(ctx.entities).length / 5) : 0.3,
    correlation_id: ctx.correlation_id,
    requester_id: ctx.requester_id,
    owner_id: ctx.owner_id,
    deadline: ctx.deadline,
    inherited: true
  };
}

module.exports = { buildContinuity };
