'use strict';

function logPhaseZ10(event, meta = {}) {
  if (process.env.IMPETUS_PHASE_Z10_LOG === 'off') return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.10', event, ...meta }));
}

module.exports = { logPhaseZ10 };
