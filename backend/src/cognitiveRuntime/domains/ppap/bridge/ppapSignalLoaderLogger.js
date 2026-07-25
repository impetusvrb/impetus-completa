'use strict';

function logPpapSignal(event, meta = {}) {
  if (process.env.IMPETUS_PPAP_SIGNAL_DIAGNOSTICS !== 'on') return;
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      layer: 'PPAP_SIGNAL_LOADER',
      event,
      ...meta
    })
  );
}

module.exports = { logPpapSignal };
