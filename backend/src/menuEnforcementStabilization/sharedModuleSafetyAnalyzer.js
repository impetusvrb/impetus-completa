'use strict';

const CORE = ['dashboard', 'settings', 'biblioteca', 'ai', 'help', 'chat', 'operational', 'proaction'];

function analyzeSharedModuleSafety(modules = []) {
  const list = Array.isArray(modules) ? modules : [];
  const missing = CORE.filter((c) => !list.includes(c));
  const safe = missing.length === 0 || (list.includes('dashboard') && list.includes('settings'));

  return {
    shared_module_safe: safe,
    missing_core: missing,
    core_preserved: list.includes('dashboard')
  };
}

module.exports = { analyzeSharedModuleSafety };
