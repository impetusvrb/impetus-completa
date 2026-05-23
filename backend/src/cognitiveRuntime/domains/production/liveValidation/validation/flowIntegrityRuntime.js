'use strict';

function validateFlowIntegrity(signalBundle = {}) {
  const constraints = signalBundle.bottlenecks?.flow_constraints || [];
  return {
    flow_constraints: constraints.length,
    operational_queues: constraints.filter((c) => c.constraint === 'throughput_ceiling').length,
    integrity_ok: constraints.every((c) => c.line)
  };
}

module.exports = { validateFlowIntegrity };
