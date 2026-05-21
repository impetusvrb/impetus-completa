'use strict';

function logPhaseZ13(event, meta = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.13', event, ...meta }));
}

module.exports = { logPhaseZ13 };
