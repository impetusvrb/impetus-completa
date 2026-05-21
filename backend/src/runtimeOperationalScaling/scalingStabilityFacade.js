'use strict';

const { runRuntimeScalingStability } = require('./runtimeScalingStability');

function assessScalingStability(tenantId, z10Pack = {}, ctx = {}) {
  return runRuntimeScalingStability(tenantId, z10Pack, ctx);
}

module.exports = { assessScalingStability };
