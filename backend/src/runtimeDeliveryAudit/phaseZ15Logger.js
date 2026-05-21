'use strict';

function logPhaseZ15(event, meta = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.15', event, ...meta }));
}

module.exports = { logPhaseZ15 };
