'use strict';

const omr = require('../memory/zOperationalMemoryRuntime');
const conv = require('../memory/zConversationMemoryGraph');

function fuseMemory(tenantId) {
  const idx = omr.index(tenantId);
  return {
    total_entries: omr.size(tenantId),
    last_5: idx.recent(5),
    last_5_conversations: conv.recentTurns(tenantId, 5),
    snapshot_size: Object.keys(omr.snapshot()).length
  };
}

module.exports = { fuseMemory };
