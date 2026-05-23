'use strict';

function resolveStrategicOee(enterpriseBundle = {}) {
  const ent = enterpriseBundle.enterprise || {};
  const oee = ent.strategic_oee ?? enterpriseBundle.domains?.production?.strategic_oee ?? 76;
  return {
    strategic_oee: oee,
    trend: oee >= 75 ? 'stable' : 'pressure',
    granular_blocked: true,
    line_level_exposed: false
  };
}

module.exports = { resolveStrategicOee };
