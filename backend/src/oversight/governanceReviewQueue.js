'use strict';

const MAX_QUEUE = Number(process.env.IMPETUS_GOVERNANCE_REVIEW_QUEUE_MAX || 500);
const _queue = [];

/**
 * Fila em memória para revisão humana (foundation — sem UI).
 */
function enqueueReview(item) {
  const entry = {
    id: item.id || `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    status: 'pending',
    severity: item.severity || 'medium',
    type: item.type || 'governance_review',
    channel: item.channel,
    user_id: item.user_id,
    trace_id: item.trace_id,
    payload: item.payload || {},
    human_action_required: false
  };
  _queue.push(entry);
  if (_queue.length > MAX_QUEUE) _queue.shift();
  return entry;
}

function listPending(limit = 50) {
  return _queue.filter((e) => e.status === 'pending').slice(-limit);
}

function listAll(limit = 100) {
  return _queue.slice(-limit);
}

function clearForTests() {
  _queue.length = 0;
}

module.exports = { enqueueReview, listPending, listAll, clearForTests };
