'use strict';

const flags = require('../flags/environmentExecutiveRuntimeFlags');

function getFoundationSnapshot() {
  return {
    enabled: flags.isEnvironmentExecutiveRuntimeEnabled(),
    flags: flags.getExecutiveRuntimeFlagSnapshot(),
    shadow: true,
    assistive_only: true
  };
}

module.exports = { getFoundationSnapshot };
