'use strict';

const flags = require('../flags/environmentCognitiveRuntimeFlags');

function getFoundationSnapshot() {
  return {
    enabled: flags.isEnvironmentCognitiveRuntimeEnabled(),
    flags: flags.getCognitiveRuntimeFlagSnapshot(),
    assistive_only: true,
    no_plc_write: true,
    no_operation_block: true,
    shadow: true
  };
}

module.exports = { getFoundationSnapshot };
