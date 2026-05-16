'use strict';

const { ppm, lotRejectionRate } = require('./qualitySupplierAnalytics');

function inboundBatchSummary(batches = []) {
  let d = 0;
  let ins = 0;
  let rej = 0;
  for (const b of batches) {
    d += b.defects || 0;
    ins += b.inspected || 0;
    rej += b.reject ? 1 : 0;
  }
  return {
    batches: batches.length,
    ppm: ppm(d, ins),
    rejection_rate_pct: lotRejectionRate(rej, batches.length)
  };
}

module.exports = {
  inboundBatchSummary
};
