'use strict';

const _timeline = new Map();

function recordSidebarLeakageEvent(tenantId, event = {}) {
  const key = String(tenantId || 'global');
  const list = _timeline.get(key) || [];
  list.push({ ts: new Date().toISOString(), phase: 'Z.14', ...event });
  if (list.length > 300) list.shift();
  _timeline.set(key, list);
  return list[list.length - 1];
}

function getSidebarLeakageTimeline(tenantId) {
  return { tenant_id: tenantId, events: _timeline.get(String(tenantId || 'global')) || [], phase: 'Z.14' };
}

function clearSidebarLeakageTimeline(tenantId) {
  if (tenantId) _timeline.delete(String(tenantId));
  else _timeline.clear();
}

module.exports = { recordSidebarLeakageEvent, getSidebarLeakageTimeline, clearSidebarLeakageTimeline };
