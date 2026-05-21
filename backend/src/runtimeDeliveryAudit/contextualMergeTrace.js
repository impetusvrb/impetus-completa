'use strict';

const { normModules, diffModules } = require('./deliveryTraceCollector');

function traceContextualMerge(before = [], contextual = [], after = [], ctx = {}) {
  const ctxIds = normModules(contextual.map((m) => m.module_id || m.menu_key || m));
  const diff = diffModules(before, after);
  const reintroduced = diff.added.filter((m) => ctxIds.includes(m));
  return {
    contextual_merge_trace: {
      modules_before: before,
      contextual_offered: ctxIds,
      modules_after: after,
      reintroduced_by_contextual: reintroduced,
      merge_conflict: reintroduced.length > 0 && ctx.governance_applied === true,
      stale_contextual: ctx.contextual_meta?.mode === 'enrich' && reintroduced.length > 0
    },
    leakage_detected: reintroduced.length > 0
  };
}

module.exports = { traceContextualMerge };
