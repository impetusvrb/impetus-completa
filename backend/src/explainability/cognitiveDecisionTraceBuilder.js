'use strict';

const { randomUUID } = require('crypto');
const { buildExposureReason } = require('./exposureReasonBuilder');

/**
 * Constrói registo de trace normalizado (Fase G).
 */
function buildTraceRecord(input = {}) {
  const trace_id = input.trace_id || randomUUID();
  const ts = input.timestamp || new Date().toISOString();

  const explanation =
    input.explanation ||
    buildExposureReason({
      decision: input.decision,
      winning_layer: input.policy_layer,
      reason: input.reason,
      domain: input.domain,
      blocked_content: input.blocked_content,
      policy_source: input.policy_source,
      envelope_scope: input.envelope_scope,
      channel: input.affected_channel,
      meta: input.meta
    });

  return {
    trace_id,
    user_id: input.user_id || null,
    tenant_id: input.tenant_id || input.company_id || null,
    domain: input.domain || explanation.domain,
    hierarchy_level: input.hierarchy_level ?? null,
    timestamp: ts,
    policy_layer: input.policy_layer || explanation.winning_layer,
    decision: input.decision || explanation.decision,
    affected_channel: input.affected_channel || input.channel || 'unknown',
    reason: input.reason || explanation.reason,
    blocked_content: input.blocked_content || explanation.blocked_content,
    explanation,
    envelope: input.envelope || null,
    shadow: input.shadow || null,
    meta: input.meta || {}
  };
}

module.exports = { buildTraceRecord };
