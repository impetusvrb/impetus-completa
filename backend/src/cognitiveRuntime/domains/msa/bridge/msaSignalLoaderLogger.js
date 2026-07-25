'use strict';

function logMsaSignal(event, meta = {}) {
  if (process.env.IMPETUS_MSA_SIGNAL_DIAGNOSTICS !== 'on') return;
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      layer: 'MSA_SIGNAL_LOADER',
      event,
      ...meta
    })
  );
}

module.exports = { logMsaSignal };
