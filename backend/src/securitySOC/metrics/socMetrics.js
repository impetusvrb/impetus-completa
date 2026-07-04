'use strict';

/**
 * SEC-07 — SOC metrics.
 */

const counters = {
  soc_dashboard_requests: 0,
  soc_executive_requests: 0,
  soc_operations_requests: 0,
  soc_summary_generated: 0,
  soc_render_time: 0
};

function increment(name, n = 1) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) counters[name] += n;
}

function recordRenderTime(ms) {
  counters.soc_render_time = ms;
}

function getSnapshot() {
  return { ...counters };
}

function resetForTests() {
  Object.keys(counters).forEach((k) => { counters[k] = 0; });
}

module.exports = { increment, recordRenderTime, getSnapshot, resetForTests };
