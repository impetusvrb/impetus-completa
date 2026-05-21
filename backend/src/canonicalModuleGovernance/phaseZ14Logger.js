'use strict';

function logPhaseZ14(event, meta = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.14', event, ...meta }));
}

module.exports = { logPhaseZ14 };
