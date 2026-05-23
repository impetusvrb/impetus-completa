'use strict';

function logPhaseZ24(event, fields = {}) {
  if (process.env.IMPETUS_MULTI_DOMAIN_OBSERVABILITY === 'off') return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.24', event, ...fields }));
}

module.exports = { logPhaseZ24 };
