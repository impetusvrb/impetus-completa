'use strict';

function logPhaseR(event, payload = {}) {
  const line = JSON.stringify({ event, ts: new Date().toISOString(), ...payload });
  console.log(line);
  return line;
}

module.exports = { logPhaseR };
