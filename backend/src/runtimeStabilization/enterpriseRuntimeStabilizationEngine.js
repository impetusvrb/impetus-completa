'use strict';

const { coordinateSimplification } = require('./runtimeSimplificationCoordinator');
const { superviseOperationalStability } = require('./operationalStabilitySupervisor');

function runStabilization(ctx = {}) {
  const coordination = coordinateSimplification(ctx);
  const stability = superviseOperationalStability({
    cognitive_operational_pressure: ctx.enterprise_cognitive_operations?.telemetry_snapshot?.cognitive_operational_pressure,
    runtime_entropy_score: ctx.enterprise_cognitive_operations?.entropy?.runtime_entropy_score
  });

  return {
    coordination,
    stability,
    lifecycle: 'observe_recommend',
    auto_remediate: false,
    auto_consolidate: false
  };
}

module.exports = { runStabilization };
