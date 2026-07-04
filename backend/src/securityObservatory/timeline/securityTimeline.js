'use strict';

/**
 * SEC-01 — Security Timeline (linha do tempo agregada).
 */

const flags = require('../config/securityObservatoryFlags');

/** @type {object[]} */
const entries = [];

/**
 * @param {object} entry
 */
function addTimelineEntry(entry) {
  entries.push(Object.freeze({
    schema_version: 'security_timeline_v1',
    timestamp: entry.timestamp || new Date().toISOString(),
    label: entry.label || '',
    event_type: entry.event_type || 'PATH_DISCOVERY',
    classification: entry.classification || 'UNKNOWN',
    request_count: entry.request_count || 0,
    source_ip: entry.source_ip || null,
    summary: entry.summary || ''
  }));
  const max = flags.maxTimelineEntries();
  while (entries.length > max) entries.shift();
  try {
    require('../metrics/securityMetricsStore').incrementCounter('timeline_entries');
  } catch (_e) {}
}

function getTimeline(limit = 100) {
  const n = Math.max(1, Math.min(limit, flags.maxTimelineEntries()));
  return entries.slice(-n);
}

function buildTimelineFromWindow(windowLabel, aggregates) {
  if (!aggregates.length) return;
  const total = aggregates.reduce((s, a) => s + a.request_count, 0);
  const topClass = aggregates[0]?.classification || 'UNKNOWN';
  addTimelineEntry({
    timestamp: aggregates[0].window_start || windowLabel,
    label: windowLabel,
    event_type: aggregates[0].event_type || 'HTTP_SCAN',
    classification: topClass,
    request_count: total,
    summary: `${total} requests agregados — ${aggregates.length} buckets`
  });
}

function resetForTests() {
  entries.length = 0;
}

module.exports = {
  addTimelineEntry,
  getTimeline,
  buildTimelineFromWindow,
  resetForTests
};
