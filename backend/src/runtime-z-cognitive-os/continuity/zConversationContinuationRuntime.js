'use strict';

const conv = require('../memory/zConversationMemoryGraph');

function buildConversationContinuation(tenantId, currentMessage = '', windowMin = 60) {
  const recent = conv.recentTurns(tenantId, 20);
  const cutoff = Date.now() - windowMin * 60 * 1000;
  const inWindow = recent.filter((t) => t.ts >= cutoff);
  const related = conv.findRelatedTurns(tenantId, currentMessage, 5);

  return {
    recent_turns_count: inWindow.length,
    last_turn: inWindow[0] || null,
    related_turns: related.map((t) => ({
      id: t.id,
      ts: t.ts,
      summary: t.summary,
      intent: t.intent
    })),
    has_continuity: inWindow.length > 0,
    window_minutes: windowMin
  };
}

module.exports = { buildConversationContinuation };
