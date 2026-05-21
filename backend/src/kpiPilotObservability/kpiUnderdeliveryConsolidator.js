'use strict';

function consolidateKpiUnderdelivery(pack = {}) {
  const u = pack.safety?.underdelivery || pack.pipeline?.graceful;
  return {
    critical: u?.critical === true || u?.critical_blocked === true,
    minimum_met: u?.minimum_met !== false,
    operational_restored: pack.pipeline?.graceful?.operational_restored?.length || 0
  };
}

module.exports = { consolidateKpiUnderdelivery };
