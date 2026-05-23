'use strict';

const { invokeSafetyBlockBridge } = require('./safetyEngineBridge');

function bridgeHazardRuntime(blockId, signals, ctx) {
  return invokeSafetyBlockBridge(blockId || 'sst.hazard_heatmap', signals, ctx);
}

module.exports = { bridgeHazardRuntime };
