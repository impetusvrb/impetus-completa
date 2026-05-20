'use strict';

function logPhaseW(event, payload = {}) {
  if (process.env.IMPETUS_CHAT_RUNTIME_OBSERVABILITY === 'off') return;
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...payload }));
}

module.exports = { logPhaseW };
