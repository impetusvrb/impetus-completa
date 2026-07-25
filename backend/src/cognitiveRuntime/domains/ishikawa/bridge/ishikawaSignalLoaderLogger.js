'use strict';

function logIshikawaSignal(event, meta = {}) {
  if (process.env.IMPETUS_ISHIKAWA_SIGNAL_DIAGNOSTICS !== 'on') return;
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      layer: 'ISHIKAWA_SIGNAL_LOADER',
      event,
      ...meta
    })
  );
}

module.exports = { logIshikawaSignal };
