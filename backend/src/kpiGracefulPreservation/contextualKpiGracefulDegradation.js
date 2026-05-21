'use strict';

const { preserveExecutiveStrategicKpis } = require('./executiveStrategicKpiPreservation');
const { applyOperationalKpiFallback } = require('./operationalKpiFallback');

function applyContextualKpiGracefulDegradation(filtered = [], original = [], ctx = {}) {
  const exec = preserveExecutiveStrategicKpis(filtered, original, ctx);
  const op = applyOperationalKpiFallback(exec.kpis, original, ctx);
  return {
    kpis: op.kpis,
    executive_preserved: exec.preserved,
    operational_restored: op.restored,
    minimum_met: op.minimum_met,
    fabricated: false
  };
}

module.exports = { applyContextualKpiGracefulDegradation };
