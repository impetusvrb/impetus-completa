'use strict';

function _normModules(mods) {
  if (!Array.isArray(mods)) return [];
  return mods.map((m) => (typeof m === 'string' ? m : m.module_id || m.menu_key || m.id || String(m))).filter(Boolean);
}

function diffModules(before = [], after = []) {
  const b = new Set(_normModules(before));
  const a = new Set(_normModules(after));
  const added = [...a].filter((x) => !b.has(x));
  const removed = [...b].filter((x) => !a.has(x));
  return { added, removed };
}

function createStage(partial = {}) {
  const before = _normModules(partial.modules_before);
  const after = _normModules(partial.modules_after);
  const diff = diffModules(before, after);
  return {
    stage: partial.stage || 'unknown',
    source: partial.source || 'runtime',
    modules_before: before,
    modules_after: after,
    added_modules: partial.added_modules || diff.added,
    removed_modules: partial.removed_modules || diff.removed,
    denied_modules: partial.denied_modules || [],
    leakage_detected: partial.leakage_detected === true,
    execution_order: partial.execution_order ?? 0,
    governance_applied: partial.governance_applied === true,
    legacy_source: partial.legacy_source === true,
    contextual_source: partial.contextual_source === true,
    fallback_applied: partial.fallback_applied === true,
    timestamp: partial.timestamp || new Date().toISOString(),
    meta: partial.meta || null
  };
}

class DeliveryTraceCollector {
  constructor(channel = 'dashboard_me') {
    this.channel = channel;
    this.stages = [];
    this._order = 0;
  }

  record(partial) {
    this._order += 1;
    const stage = createStage({ ...partial, execution_order: this._order });
    this.stages.push(stage);
    return stage;
  }

  recordModuleTransition(stage, source, before, after, opts = {}) {
    return this.record({
      stage,
      source,
      modules_before: before,
      modules_after: after,
      ...opts
    });
  }

  getTimeline() {
    return this.stages.slice();
  }

  detectOverwrites() {
    const conflicts = [];
    for (let i = 1; i < this.stages.length; i++) {
      const prev = this.stages[i - 1];
      const cur = this.stages[i];
      for (const mod of cur.added_modules) {
        if (prev.removed_modules.includes(mod)) {
          conflicts.push({
            type: 'reinjection',
            module: mod,
            after_stage: prev.stage,
            at_stage: cur.stage
          });
        }
      }
    }
    return conflicts;
  }
}

module.exports = {
  DeliveryTraceCollector,
  createStage,
  diffModules,
  normModules: _normModules
};
