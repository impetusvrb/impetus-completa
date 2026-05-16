'use strict';

function buildAuditTimeline(events = []) {
  return [...events]
    .map((e) => ({
      at: e.at || e.occurred_at,
      type: e.type || e.event_name,
      ref: e.ref || null
    }))
    .filter((e) => e.at)
    .sort((a, b) => Date.parse(String(a.at)) - Date.parse(String(b.at)));
}

module.exports = {
  buildAuditTimeline
};
