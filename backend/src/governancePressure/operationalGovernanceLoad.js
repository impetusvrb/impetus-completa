'use strict';

function measureOperationalGovernanceLoad(pressurePack = {}, obsPack = {}) {
  const load = Math.min(1, (pressurePack.pressure_score ?? 0) * 0.6 + (obsPack.observability_pressure ?? 0) * 0.4);
  return {
    governance_load: load,
    overload: load > 0.6,
    graceful_degradation: true
  };
}

module.exports = { measureOperationalGovernanceLoad };
