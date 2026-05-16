'use strict';

/** FPY = passed / total */
function fpy(passed, total) {
  if (!total) return null;
  return (passed / total) * 100;
}

/** RTY encadeado simplificado (yield1*yield2*...) */
function rty(yields = []) {
  const y = yields.filter((v) => Number.isFinite(v) && v >= 0 && v <= 1);
  if (!y.length) return null;
  return y.reduce((a, b) => a * b, 1) * 100;
}

/** COPQ proxy: scrap_cost + rework_cost (valores já agregados) */
function copqEstimate(scrapCost, reworkCost) {
  return (Number(scrapCost) || 0) + (Number(reworkCost) || 0);
}

module.exports = {
  fpy,
  rty,
  copqEstimate
};
