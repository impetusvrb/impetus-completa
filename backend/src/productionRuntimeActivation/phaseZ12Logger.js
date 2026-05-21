'use strict';

function logPhaseZ12(event, meta = {}) {
  if (process.env.IMPETUS_PHASE_Z12_LOG === 'off') return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.12', event, ...meta }));
}

module.exports = { logPhaseZ12 };
