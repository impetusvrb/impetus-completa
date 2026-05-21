'use strict';

const { resolveFinalModuleAuthority } = require('./finalModuleAuthority');
const { filterDeniedFromList } = require('./deniedPublicationTerminalLock');
const { applyTerminalLockState } = require('./terminalGovernanceLock');

function resolveFinalDelivery(modules = [], ctx = {}) {
  const sgr = ctx.sidebar_governance_runtime || {};
  const base = sgr.final_visible_modules || modules;
  const authority = resolveFinalModuleAuthority(base, {
    ...ctx,
    denied_publications: sgr.denied_publications || ctx.denied_publications,
    removed_modules: (sgr.removed_modules || []).map((r) => (typeof r === 'string' ? r : r.module || r))
  });
  const contextual = filterDeniedFromList(ctx.contextual_modules || [], {
    denied_publications: sgr.denied_publications,
    denied_modules: authority.denied_blocked.map((b) => b.item)
  });

  const lock = applyTerminalLockState(authority.final_modules, ctx);

  return {
    final_visible_modules: lock.final_visible_modules,
    final_contextual_modules: contextual.kept,
    contextual_modules_mode: 'STRICT',
    terminal_lock: lock,
    pipeline: [
      'identity',
      'hierarchy',
      'domain',
      'authority',
      'governance',
      'contextual_filtering',
      'denied_publications',
      'final_visible_modules',
      'TERMINAL_LOCK'
    ]
  };
}

module.exports = { resolveFinalDelivery };
