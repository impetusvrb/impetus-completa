'use strict';

function logPhaseX(event, payload = {}) {
  if (process.env.IMPETUS_RUNTIME_ENRICHMENT_OBSERVABILITY === 'off') return;
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...payload }));
}

module.exports = { logPhaseX };
