'use strict';

function assessSummaryOperationalCoherence(cockpitPack = {}) {
  const c = cockpitPack.cockpit || {};
  const kpi = cockpitPack.kpi || {};
  const dash = cockpitPack.dashboard || {};
  const score = (c.coherence_score || 0) * 0.4 + (kpi.coherent ? 0.4 : 0) + (dash.aligned ? 0.2 : 0);
  return { operational_coherence_score: score, coherent: score >= 0.5 };
}

module.exports = { assessSummaryOperationalCoherence };
