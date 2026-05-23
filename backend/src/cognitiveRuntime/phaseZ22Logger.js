'use strict';

function logPhaseZ22(event, fields = {}) {
  if (process.env.IMPETUS_RENDER_PROMOTION_OBSERVABILITY === 'off') return;
  const line = {
    ts: new Date().toISOString(),
    layer: 'Z.22',
    event,
    ...fields
  };
  console.log(JSON.stringify(line));
}

module.exports = { logPhaseZ22 };
