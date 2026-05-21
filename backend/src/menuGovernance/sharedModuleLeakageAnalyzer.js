'use strict';

const SHARED_BROAD = ['operational', 'proaction', 'ai', 'chat'];

function analyzeSharedModuleLeakage(ctx = {}) {
  const modules = ctx.visible_modules || [];
  const axis = ctx.canonical_identity?.domain_axis || ctx.functional_axis;
  const leaks = [];

  const sharedCount = modules.filter((m) => SHARED_BROAD.includes(m)).length;
  if (sharedCount >= 3 && ['hr', 'finance'].includes(axis)) {
    leaks.push({ type: 'excessive_shared_modules', count: sharedCount, axis });
  }
  if (modules.includes('operational') && axis === 'hr') {
    leaks.push({ type: 'hr_operational_centro_exposure', module: 'operational' });
  }

  return {
    shared_module_pressure: sharedCount,
    leakage_detected: leaks.length > 0,
    leaks,
    auto_hide: false
  };
}

module.exports = { analyzeSharedModuleLeakage };
