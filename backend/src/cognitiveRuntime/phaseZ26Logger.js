'use strict';

function logPhaseZ26(event, fields = {}) {
  if (process.env.IMPETUS_HR_OBSERVABILITY === 'off') return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.26', event, ...fields }));
}

module.exports = { logPhaseZ26 };
