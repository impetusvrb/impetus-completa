'use strict';

const { ppm } = require('./qualitySupplierAnalytics');

function buildSupplierScorecard(supplierId, rows = []) {
  let inspected = 0;
  let defects = 0;
  let rejects = 0;
  let lots = 0;
  for (const r of rows) {
    inspected += r.inspected || 0;
    defects += r.defects || 0;
    rejects += r.rejected_lots || 0;
    lots += r.lots || 0;
  }
  const p = ppm(defects, inspected);
  const score = p == null ? null : Math.max(0, 100 - Math.min(100, Math.log10(1 + p / 100) * 25));
  return {
    supplier_id: supplierId,
    inspected,
    defects,
    ppm: p,
    quality_score_0_100: score,
    lot_rejection_pct: lots ? (rejects / lots) * 100 : null,
    advisory_only: true
  };
}

module.exports = {
  buildSupplierScorecard
};
