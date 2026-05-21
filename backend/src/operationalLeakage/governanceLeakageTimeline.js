'use strict';

const _timeline = new Map();

function recordGovernanceLeakageEvent(tenantId, event = {}) {
  const key = String(tenantId);
  const list = _timeline.get(key) || [];
  list.push({ ts: new Date().toISOString(), ...event });
  if (list.length > 200) list.shift();
  _timeline.set(key, list);
  return list[list.length - 1];
}

function getGovernanceLeakageTimeline(tenantId) {
  return { tenant_id: tenantId, events: _timeline.get(String(tenantId)) || [], phase: 'Z.13' };
}

function clearGovernanceLeakageTimeline(tenantId) {
  if (tenantId) _timeline.delete(String(tenantId));
  else _timeline.clear();
}

module.exports = { recordGovernanceLeakageEvent, getGovernanceLeakageTimeline, clearGovernanceLeakageTimeline };
