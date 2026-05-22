'use strict';

function logPhaseZ21(event, meta = {}) {
  if (process.env.IMPETUS_SPECIALIZED_DELIVERY_OBSERVABILITY !== 'off') {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        layer: 'Z.21',
        event,
        ...meta
      })
    );
  }
}

module.exports = { logPhaseZ21 };
