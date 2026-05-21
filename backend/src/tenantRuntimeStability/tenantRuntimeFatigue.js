'use strict';

function assessTenantRuntimeFatigue(pack = {}) {
  const obsLayers =
    (pack.observability_layers || 0) +
    (pack.kpi_observability ? 1 : 0) +
    (pack.summary_observability ? 1 : 0);
  const fatigue = Math.min(1, obsLayers * 0.12);

  return {
    fatigue_score: fatigue,
    fatigued: fatigue > 0.45,
    observability_layers: obsLayers
  };
}

module.exports = { assessTenantRuntimeFatigue };
