'use strict';

function assessContextualSignalStrength(kpis = []) {
  const withValue = kpis.filter((k) => k.value != null || k.current != null || k.score != null).length;
  const strength = kpis.length ? withValue / kpis.length : 0;
  return { signal_strength: Number(strength.toFixed(4)), data_bound_kpis: withValue };
}

module.exports = { assessContextualSignalStrength };
