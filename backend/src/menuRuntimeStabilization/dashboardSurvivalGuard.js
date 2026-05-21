'use strict';

function guardDashboardSurvival(modules = []) {
  if (!modules.includes('dashboard')) {
    return {
      visible_modules: ['dashboard', 'settings', ...modules.filter((m) => m !== 'dashboard')],
      survival_guard_applied: true,
      reason: 'dashboard_injected'
    };
  }
  return { visible_modules: modules, survival_guard_applied: false };
}

module.exports = { guardDashboardSurvival };
