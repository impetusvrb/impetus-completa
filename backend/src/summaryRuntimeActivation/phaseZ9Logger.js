'use strict';

function logPhaseZ9(event, meta = {}) {
  if (process.env.IMPETUS_PHASE_Z9_LOG === 'off') return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.9', event, ...meta }));
}

module.exports = { logPhaseZ9 };
