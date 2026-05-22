'use strict';

function logPhaseZ20(event, meta = {}) {
  if (process.env.IMPETUS_COGNITIVE_BINDING_VALIDATION !== 'off') {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        layer: 'Z.20',
        event,
        ...meta
      })
    );
  }
}

module.exports = { logPhaseZ20 };
