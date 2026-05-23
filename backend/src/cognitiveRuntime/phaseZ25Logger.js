'use strict';

function logPhaseZ25(event, fields = {}) {
  if (process.env.IMPETUS_SST_OBSERVABILITY === 'off') return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.25', event, ...fields }));
}

module.exports = { logPhaseZ25 };
