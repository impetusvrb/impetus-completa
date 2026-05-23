'use strict';

function superviseDegradedRuntime(validation = {}) {
  const health = validation.telemetry_health || {};
  if (health.ready) return { mode: 'normal', supervisor_action: 'none' };
  if (health.empty_state) return { mode: 'empty_graceful', supervisor_action: 'preserve_legacy_widgets' };
  return { mode: 'degraded', supervisor_action: 'density_throttle' };
}

module.exports = { superviseDegradedRuntime };
