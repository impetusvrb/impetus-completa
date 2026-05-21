'use strict';

function balanceExecutiveOperationalNarrative(payload = {}, ctx = {}) {
  const tier = ctx.canonical_identity?.hierarchy_tier;
  const blocks = payload.blocks || payload.sections || [];
  if (tier !== 'executive' || !Array.isArray(blocks)) {
    return { payload, balanced: false };
  }
  const filtered = blocks.filter((b) => {
    const t = String(b.title || b.type || '').toLowerCase();
    return !/plc|turno|linha ativa|operador/i.test(t);
  });
  return {
    payload: filtered.length ? { ...payload, blocks: filtered } : payload,
    balanced: filtered.length !== blocks.length,
    rewrite_applied: false
  };
}

module.exports = { balanceExecutiveOperationalNarrative };
