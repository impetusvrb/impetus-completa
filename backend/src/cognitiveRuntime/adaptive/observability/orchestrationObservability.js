'use strict';

function emitOrchestrationObservability(event, meta = {}) {
  if (process.env.IMPETUS_ORCHESTRATION_OBSERVABILITY === 'off') return;
  try {
    console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.28', event, ...meta }));
  } catch (_) {}
}

module.exports = { emitOrchestrationObservability };
