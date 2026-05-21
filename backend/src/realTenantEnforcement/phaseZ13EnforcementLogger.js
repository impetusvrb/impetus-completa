'use strict';

function logPhaseZ13Enforcement(event, meta = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.13-enforcement', event, ...meta }));
}

module.exports = { logPhaseZ13Enforcement };
