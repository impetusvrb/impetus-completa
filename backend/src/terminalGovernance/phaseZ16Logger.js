'use strict';

function logPhaseZ16(event, meta = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.16', event, ...meta }));
}

module.exports = { logPhaseZ16 };
