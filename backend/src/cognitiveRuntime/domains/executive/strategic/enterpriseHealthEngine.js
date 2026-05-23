'use strict';

function computeEnterpriseHealth(enterpriseBundle = {}) {
  const ent = enterpriseBundle.enterprise || {};
  return {
    health_index: ent.health_index ?? 72,
    risk_index: ent.risk_index ?? 25,
    pressure_index: ent.pressure_index ?? 30,
    reliable: (ent.health_index ?? 72) >= 65
  };
}

module.exports = { computeEnterpriseHealth };
