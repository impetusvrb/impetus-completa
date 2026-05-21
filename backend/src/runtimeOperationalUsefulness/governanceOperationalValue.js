'use strict';

function assessGovernanceOperationalValue(maturityPack = {}, pressurePack = {}) {
  const maturity = maturityPack.maturity_score ?? 0.5;
  const overload = pressurePack.load?.overload === true;
  const value = overload ? maturity * 0.6 : maturity;
  return { governance_value: value, value_degraded_by_pressure: overload };
}

module.exports = { assessGovernanceOperationalValue };
