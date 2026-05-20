'use strict';

function logPhaseY(event, payload = {}) {
  if (process.env.IMPETUS_RUNTIME_CALIBRATION_OBSERVABILITY === 'off') return;
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...payload }));
}

module.exports = { logPhaseY };
