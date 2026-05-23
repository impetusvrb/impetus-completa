'use strict';

function emitMaintenanceCockpitTelemetry(event, meta = {}) {
  if (process.env.IMPETUS_MAINTENANCE_OBSERVABILITY !== 'on' && process.env.IMPETUS_MAINTENANCE_OBSERVABILITY !== 'true') {
    return;
  }
  try {
    console.info(`[MAINTENANCE_COCKPIT] ${event}`, JSON.stringify(meta));
  } catch (_) {}
}

module.exports = { emitMaintenanceCockpitTelemetry };
