'use strict';

function logPhaseU(event, payload = {}) {
  if (process.env.IMPETUS_KPI_STABILIZATION_OBSERVABILITY === 'off') return;
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...payload }));
}

module.exports = { logPhaseU };
