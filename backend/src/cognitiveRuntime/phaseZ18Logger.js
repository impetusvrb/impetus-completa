'use strict';

function logPhaseZ18(event, meta = {}) {
  if (process.env.IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY !== 'off') {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        layer: 'Z.18',
        event,
        ...meta
      })
    );
  }
}

module.exports = { logPhaseZ18 };
