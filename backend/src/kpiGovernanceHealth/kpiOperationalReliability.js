'use strict';

function assessKpiOperationalReliability(pack = {}) {
  const useful = pack.quality?.usefulness?.operationally_useful !== false;
  const cockpit = pack.cockpit?.cockpit_preserved !== false;
  const score = (useful ? 0.5 : 0) + (cockpit ? 0.5 : 0);
  return { operational_reliability: Number(score.toFixed(4)), cockpit_ok: cockpit, useful };
}

module.exports = { assessKpiOperationalReliability };
