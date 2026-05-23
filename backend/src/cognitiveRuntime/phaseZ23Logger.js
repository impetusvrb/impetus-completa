'use strict';

function logPhaseZ23(event, fields = {}) {
  if (process.env.IMPETUS_SPECIALIZED_COCKPIT_OBSERVABILITY === 'off') return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.23', event, ...fields }));
}

module.exports = { logPhaseZ23 };
