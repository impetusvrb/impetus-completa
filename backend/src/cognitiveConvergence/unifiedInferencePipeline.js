'use strict';

const { orchestrateAiRequest } = require('./governedAiOrchestrator');

function runUnifiedInference(user, payload, ctx = {}) {
  const channel = ctx.channel || 'chat';
  const orchestration = orchestrateAiRequest(user, channel, ctx);
  return {
    input: payload,
    orchestration,
    inference_converged: orchestration.enforcement_active,
    pipeline: 'unified_inference_v1',
    shadow_only: orchestration.shadow_only
  };
}

module.exports = { runUnifiedInference };
