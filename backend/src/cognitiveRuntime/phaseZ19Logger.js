'use strict';

function logPhaseZ19(event, meta = {}) {
  if (process.env.IMPETUS_COGNITIVE_COMPOSITION_OBSERVABILITY !== 'off') {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        layer: 'Z.19',
        event,
        ...meta
      })
    );
  }
}

module.exports = { logPhaseZ19 };
