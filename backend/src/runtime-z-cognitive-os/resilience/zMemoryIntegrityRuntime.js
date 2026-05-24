'use strict';

const omr = require('../memory/zOperationalMemoryRuntime');

function verifyMemoryIntegrity(tenantId) {
  try {
    const entries = omr.list(tenantId);
    const dup = new Map();
    let conflicts = 0;
    for (const e of entries) {
      if (dup.has(e.id)) conflicts += 1;
      dup.set(e.id, true);
    }
    return {
      ok: conflicts === 0,
      size: entries.length,
      duplicate_ids: conflicts,
      integrity_score: conflicts === 0 ? 1 : Number(Math.max(0, 1 - conflicts / entries.length).toFixed(3))
    };
  } catch (e) {
    return { ok: false, error: e?.message || 'memory_integrity_error' };
  }
}

module.exports = { verifyMemoryIntegrity };
