'use strict';

function logPhaseT(event, payload = {}) {
  if (process.env.IMPETUS_KPI_GOVERNANCE_OBSERVABILITY === 'off') return;
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...payload }));
}

module.exports = { logPhaseT };
