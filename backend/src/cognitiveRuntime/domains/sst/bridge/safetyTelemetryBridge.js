'use strict';

const { invokeSafetyBlockBridge } = require('./safetyEngineBridge');

function bridgeSafetyTelemetry(blockId, signals, ctx) {
  return invokeSafetyBlockBridge(blockId || 'sst.safety_telemetry', signals, ctx);
}

module.exports = { bridgeSafetyTelemetry };
