'use strict';

const { superviseRuntime } = require('./runtimeCognitiveSupervisor');
const { getCognitiveOperationalState, updateOperationalState } = require('./cognitiveOperationalState');

function runEnterpriseOperations(user, ctx = {}) {
  const supervision = superviseRuntime(user, ctx);
  updateOperationalState({ last_supervision: supervision.supervised_at });

  return {
    operational_state: getCognitiveOperationalState(),
    supervision,
    lifecycle: 'continuous_observe',
    auto_correct: false,
    auto_calibrate: false
  };
}

module.exports = { runEnterpriseOperations };
