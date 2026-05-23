'use strict';

function analyzeEnterprisePressure(enterprise = {}) {
  const p = enterprise.pressure_index ?? 30;
  return { enterprise_pressure: p, saturation: p > 70, safe: p <= 65 };
}

module.exports = { analyzeEnterprisePressure };
