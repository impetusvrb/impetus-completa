'use strict';

function logLogisticsSignal(event, meta = {}) {
  if (process.env.IMPETUS_LOGISTICS_SIGNAL_DIAGNOSTICS !== 'on') return;
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      layer: 'LOGISTICS_SIGNAL_LOADER',
      event,
      ...meta
    })
  );
}

module.exports = { logLogisticsSignal };
