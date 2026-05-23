'use strict';

function balanceOrganizationalSignals(usefulness = {}) {
  const domains = usefulness.domains || {};
  const vals = Object.values(domains).filter((v) => v != null);
  const spread = vals.length ? Math.max(...vals) - Math.min(...vals) : 0;
  return { signal_spread: Math.round(spread * 100) / 100, saturation_collision: spread > 0.35 };
}

module.exports = { balanceOrganizationalSignals };
