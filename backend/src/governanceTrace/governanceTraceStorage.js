'use strict';

const MAX_TRACES = Number(process.env.IMPETUS_GOVERNANCE_TRACE_MAX || 5000);
const MAX_PER_USER = Number(process.env.IMPETUS_GOVERNANCE_TRACE_PER_USER || 200);

const _tracesById = new Map();
const _tracesByUser = new Map();

function _trimUser(userId) {
  const list = _tracesByUser.get(userId);
  if (!list || list.length <= MAX_PER_USER) return;
  const removed = list.splice(0, list.length - MAX_PER_USER);
  for (const id of removed) {
    if (_tracesById.get(id)?.user_id === userId) _tracesById.delete(id);
  }
}

function _trimGlobal() {
  if (_tracesById.size <= MAX_TRACES) return;
  const entries = [..._tracesById.entries()].sort((a, b) => String(a[1].timestamp).localeCompare(String(b[1].timestamp)));
  const excess = entries.length - MAX_TRACES;
  for (let i = 0; i < excess; i++) {
    const [id, rec] = entries[i];
    _tracesById.delete(id);
    const ul = _tracesByUser.get(rec.user_id);
    if (ul) {
      const idx = ul.indexOf(id);
      if (idx >= 0) ul.splice(idx, 1);
    }
  }
}

function storeTrace(record) {
  if (!record?.trace_id) return false;
  _tracesById.set(record.trace_id, record);
  const uid = record.user_id || '__anonymous__';
  if (!_tracesByUser.has(uid)) _tracesByUser.set(uid, []);
  const list = _tracesByUser.get(uid);
  list.push(record.trace_id);
  _trimUser(uid);
  _trimGlobal();
  return true;
}

function getTrace(traceId) {
  return _tracesById.get(traceId) || null;
}

function listTracesForUser(userId, limit = 50) {
  const ids = _tracesByUser.get(userId) || [];
  return ids
    .slice(-limit)
    .map((id) => _tracesById.get(id))
    .filter(Boolean)
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
}

function listAllTraces(limit = 100) {
  return [..._tracesById.values()]
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))
    .slice(-limit);
}

function clearForTests() {
  _tracesById.clear();
  _tracesByUser.clear();
}

module.exports = {
  storeTrace,
  getTrace,
  listTracesForUser,
  listAllTraces,
  clearForTests
};
