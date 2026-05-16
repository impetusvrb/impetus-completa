'use strict';

/**
 * WAVE 4 — protecção contra auto-loop cognitivo (detect sempre; enforce opt-in).
 */

const flags = require('./cognitiveBudgetFlags');

/** @type {Map<string, { chain: string[], timestamps: number[] }>} */
const _chains = new Map();

function _key(ctx) {
  return `${ctx.company_id || 'na'}:${ctx.conversation_id || ctx.session_id || 'na'}`;
}

/**
 * @param {object} ctx — { company_id, conversation_id, causation_id?, invocation_kind? }
 */
function checkInvocation(ctx) {
  if (!flags.isAutoloopGuardEnabled()) {
    return { allowed: true, guard_enabled: false };
  }

  const key = _key(ctx);
  const now = Date.now();
  const windowMs = flags.autoloopWindowMs();
  const maxDepth = flags.autoloopMaxDepth();

  let entry = _chains.get(key);
  if (!entry) {
    entry = { chain: [], timestamps: [] };
    _chains.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
  entry.timestamps.push(now);

  const causation = ctx.causation_id || ctx.parent_trace_id || null;
  if (causation) {
    entry.chain.push(String(causation).slice(0, 128));
    if (entry.chain.length > maxDepth * 2) entry.chain.shift();
  }

  const depth = entry.timestamps.length;
  const repeatedCausation =
    causation && entry.chain.filter((c) => c === causation).length >= 2;

  const loopSuspected = depth > maxDepth || repeatedCausation;

  if (loopSuspected) {
    try {
      console.warn(
        '[AI_AUTOLOOP_GUARD]',
        JSON.stringify({
          event: 'AI_AUTOLOOP_GUARD',
          company_id: ctx.company_id,
          conversation_id: ctx.conversation_id,
          depth,
          repeated_causation: repeatedCausation,
          enforce: flags.isAutoloopGuardEnforce()
        })
      );
    } catch (_e) {}
  }

  const blocked = loopSuspected && flags.isAutoloopGuardEnforce();

  return {
    allowed: !blocked,
    guard_enabled: true,
    loop_suspected: loopSuspected,
    blocked,
    depth,
    observe_only: !flags.isAutoloopGuardEnforce()
  };
}

function resetChain(ctx) {
  _chains.delete(_key(ctx));
}

function getGuardStats() {
  return {
    active_chains: _chains.size,
    enforce: flags.isAutoloopGuardEnforce(),
    max_depth: flags.autoloopMaxDepth(),
    window_ms: flags.autoloopWindowMs()
  };
}

module.exports = {
  checkInvocation,
  resetChain,
  getGuardStats
};
