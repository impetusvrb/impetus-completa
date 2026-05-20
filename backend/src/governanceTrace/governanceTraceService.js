'use strict';

const phaseG = require('../explainability/config/phaseGFeatureFlags');
const { logPhaseG } = require('../explainability/phaseGLogger');
const storage = require('./governanceTraceStorage');
const { buildUserTimeline } = require('./governanceTimelineBuilder');
const { buildTraceRecord } = require('../explainability/cognitiveDecisionTraceBuilder');

let auditFeed = null;
function getAuditFeed() {
  if (!auditFeed) {
    try {
      auditFeed = require('../audit/cognitiveGovernanceAuditFeed');
    } catch {
      auditFeed = null;
    }
  }
  return auditFeed;
}

function recordTrace(recordOrInput) {
  const record = recordOrInput.trace_id ? recordOrInput : buildTraceRecord(recordOrInput);
  if (!phaseG.isGovernanceTraceEnabled()) {
    return { stored: false, trace_id: record.trace_id, shadow_only: true };
  }

  storage.storeTrace(record);
  logPhaseG('GOVERNANCE_TRACE_RECORDED', {
    trace_id: record.trace_id,
    user_id: record.user_id,
    decision: record.decision,
    channel: record.affected_channel
  });

  if (phaseG.isGovernanceAuditFeedEnabled()) {
    const feed = getAuditFeed();
    if (feed) feed.append(record);
  }

  return { stored: true, trace_id: record.trace_id };
}

function getTrace(traceId) {
  return storage.getTrace(traceId);
}

function getUserTimeline(userId, limit = 50) {
  const traces = storage.listTracesForUser(userId, limit);
  return buildUserTimeline(userId, traces);
}

function explainTrace(traceId) {
  const trace = getTrace(traceId);
  if (!trace) return null;
  return {
    trace_id: trace.trace_id,
    explanation: trace.explanation,
    envelope: trace.envelope,
    shadow: trace.shadow,
    record: trace
  };
}

module.exports = {
  recordTrace,
  getTrace,
  getUserTimeline,
  explainTrace,
  listRecent: (n) => storage.listAllTraces(n)
};
