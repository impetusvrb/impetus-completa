'use strict';

function logPhaseV(event, payload = {}) {
  if (process.env.IMPETUS_SUMMARY_GOVERNANCE_OBSERVABILITY === 'off') return;
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...payload }));
}

module.exports = { logPhaseV };
