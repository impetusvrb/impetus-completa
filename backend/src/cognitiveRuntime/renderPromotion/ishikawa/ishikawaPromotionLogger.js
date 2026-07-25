'use strict';

function logIshikawaPromotion(event, meta = {}) {
  if (process.env.IMPETUS_ISHIKAWA_PROMOTION_DIAGNOSTICS !== 'on') return;
  const safe = { ...meta };
  delete safe.user;
  delete safe.payload;
  delete safe.notes;
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      layer: 'ISHIKAWA_PROMOTION',
      runtime: 'ishikawa_native',
      event,
      ...safe
    })
  );
}

module.exports = { logIshikawaPromotion };
