'use strict';

function logPhaseP(event, payload = {}) {
  const line = JSON.stringify({ event, ts: new Date().toISOString(), ...payload });
  console.log(line);
  return line;
}

module.exports = { logPhaseP };
