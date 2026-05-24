'use strict';

const omr = require('./zOperationalMemoryRuntime');

const TYPE = 'conversation';

function recordTurn(tenantId, user, turn = {}) {
  return omr.record(tenantId, {
    type: TYPE,
    user_id: user?.id || null,
    summary: turn.summary || turn.message || '',
    intent: turn.intent || null,
    payload: {
      role: turn.role || 'user',
      message: turn.message,
      response: turn.response,
      conversation_id: turn.conversation_id || null
    },
    tags: turn.tags || [],
    domain: turn.domain || null,
    correlation_id: turn.conversation_id || null
  });
}

function recentTurns(tenantId, limit = 10) {
  return omr.index(tenantId).byTypeRecent(TYPE, limit);
}

function findRelatedTurns(tenantId, text, limit = 5) {
  return omr.index(tenantId).search(text, limit).filter((e) => e.type === TYPE);
}

function buildConversationGraph(tenantId) {
  const turns = recentTurns(tenantId, 30);
  const edges = [];
  for (let i = 1; i < turns.length; i++) {
    edges.push({ from: turns[i].id, to: turns[i - 1].id, relation: 'follows' });
  }
  return { nodes: turns.map((t) => ({ id: t.id, ts: t.ts, summary: t.summary, intent: t.intent })), edges };
}

module.exports = { recordTurn, recentTurns, findRelatedTurns, buildConversationGraph, TYPE };
