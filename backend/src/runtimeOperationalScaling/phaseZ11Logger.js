'use strict';

function logPhaseZ11(event, meta = {}) {
  if (process.env.IMPETUS_PHASE_Z11_LOG === 'off') return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.11', event, ...meta }));
}

module.exports = { logPhaseZ11 };
