'use strict';

function logPhaseO(event, payload = {}) {
  const line = JSON.stringify({ event, ts: new Date().toISOString(), ...payload });
  console.log(line);
  return line;
}

module.exports = { logPhaseO };
