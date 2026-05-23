'use strict';

function logPhaseZP0(event, fields = {}) {
  if (process.env.IMPETUS_PRODUCTION_OBSERVABILITY === 'off') return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.P0', event, ...fields }));
}

module.exports = { logPhaseZP0 };
