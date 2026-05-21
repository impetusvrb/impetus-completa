'use strict';

function assessSummaryOperationalReliability(pack = {}) {
  const useful = pack.assurance?.operational?.assured !== false || pack.assurance?.executive?.assured !== false;
  const aligned = pack.narrative_integrity?.integrity >= 0.6;
  const score = (useful ? 0.5 : 0) + (aligned ? 0.5 : 0);
  return { operational_reliability: Number(score.toFixed(4)), operationally_useful: useful };
}

module.exports = { assessSummaryOperationalReliability };
