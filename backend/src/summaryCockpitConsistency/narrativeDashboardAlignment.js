'use strict';

function assessNarrativeDashboardAlignment(summaryPayload = {}, ctx = {}) {
  const modules = ctx.visible_modules || ctx.dashboard_modules || [];
  const hasDash = Array.isArray(modules) && modules.includes('dashboard');
  return {
    dashboard_module_visible: hasDash,
    aligned: hasDash !== false,
    modules_count: Array.isArray(modules) ? modules.length : 0
  };
}

module.exports = { assessNarrativeDashboardAlignment };
