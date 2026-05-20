'use strict';

/**
 * Ordena eventos de trace numa timeline cognitiva.
 */
function buildTimeline(traces = []) {
  const sorted = [...traces].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return sorted.map((t, idx) => ({
    sequence: idx + 1,
    trace_id: t.trace_id,
    timestamp: t.timestamp,
    decision: t.decision,
    policy_layer: t.policy_layer,
    affected_channel: t.affected_channel,
    reason: t.reason,
    domain: t.domain,
    summary: t.explanation?.human_summary || t.reason
  }));
}

function buildUserTimeline(userId, traces = []) {
  return {
    user_id: userId,
    event_count: traces.length,
    first_at: traces[0]?.timestamp || null,
    last_at: traces[traces.length - 1]?.timestamp || null,
    timeline: buildTimeline(traces)
  };
}

module.exports = { buildTimeline, buildUserTimeline };
