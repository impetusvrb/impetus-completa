'use strict';

const _timeline = [];

function appendToTimeline(incident) {
  const entry = {
    id: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    recorded_at: new Date().toISOString(),
    ...incident
  };
  _timeline.push(entry);
  if (_timeline.length > 1000) _timeline.shift();
  return entry;
}

function listTimeline(opts = {}) {
  let items = [..._timeline];
  if (opts.severity) items = items.filter((i) => i.severity === opts.severity);
  if (opts.type) items = items.filter((i) => i.type === opts.type);
  if (opts.tenant_id) items = items.filter((i) => i.tenant_id === opts.tenant_id);
  const limit = Number(opts.limit) || 100;
  return items.slice(-limit);
}

function clearForTests() {
  _timeline.length = 0;
}

module.exports = { appendToTimeline, listTimeline, clearForTests };
