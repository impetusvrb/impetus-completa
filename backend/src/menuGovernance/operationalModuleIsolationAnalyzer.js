'use strict';

function analyzeOperationalModuleIsolation(ctx = {}) {
  const tier = ctx.canonical_identity?.hierarchy_tier;
  const modules = ctx.visible_modules || [];
  const issues = [];

  const strategic = ['audit', 'admin'];
  if (tier === 'operational' || tier === 'supervision') {
    for (const m of strategic) {
      if (modules.includes(m)) {
        issues.push({ type: 'operator_strategic_module', module: m });
      }
    }
  }

  return {
    operational_isolation_ok: issues.length === 0,
    issues,
    auto_hide: false
  };
}

module.exports = { analyzeOperationalModuleIsolation };
