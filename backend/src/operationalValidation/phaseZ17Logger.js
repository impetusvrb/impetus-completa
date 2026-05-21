'use strict';

function logPhaseZ17(event, payload = {}) {
  try {
    console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.17', event, ...payload }));
  } catch {
    /* ignore */
  }
}

module.exports = { logPhaseZ17 };
