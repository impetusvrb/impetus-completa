'use strict';

function analyzeExecutiveModuleIsolation(ctx = {}) {
  const tier = ctx.canonical_identity?.hierarchy_tier || ctx.hierarchy_tier;
  const modules = ctx.visible_modules || [];
  const issues = [];

  const operationalHeavy = ['manuia', 'anomaly_detection', 'raw_material_lots', 'quality_intelligence'];
  if (tier === 'executive' || tier === 'management') {
    for (const m of operationalHeavy) {
      if (modules.includes(m)) {
        issues.push({ type: 'executive_operational_exposure', module: m });
      }
    }
  }

  return {
    executive_isolation_ok: issues.length === 0,
    issues,
    recommendation: issues.length ? 'Isolar módulos de cockpit operacional do perfil executivo (supervisão)' : null,
    auto_hide: false
  };
}

module.exports = { analyzeExecutiveModuleIsolation };
