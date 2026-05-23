'use strict';

function emitExecutiveBoardroomTelemetry(event, meta = {}) {
  if (process.env.IMPETUS_EXECUTIVE_OBSERVABILITY === 'off') return;
  try {
    console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'executive_boardroom', event, ...meta }));
  } catch (_) {}
}

module.exports = { emitExecutiveBoardroomTelemetry };
