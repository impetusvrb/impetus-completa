'use strict';

function assessTenantOperationalSignalQuality(ctx = {}) {
  const modules = ctx.visible_modules || [];
  const signal = Math.min(1, (Array.isArray(modules) ? modules.length : 0) * 0.05 + 0.4);
  return { signal_quality: signal, cockpit_signal_present: modules.includes('dashboard') };
}

module.exports = { assessTenantOperationalSignalQuality };
