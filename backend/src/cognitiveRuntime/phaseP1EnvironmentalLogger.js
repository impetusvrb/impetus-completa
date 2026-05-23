'use strict';

function logPhaseP1Environmental(event, fields = {}) {
  if (process.env.IMPETUS_ENVIRONMENTAL_OBSERVABILITY === 'off') return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'P1-ENV', event, ...fields }));
}

module.exports = { logPhaseP1Environmental };
