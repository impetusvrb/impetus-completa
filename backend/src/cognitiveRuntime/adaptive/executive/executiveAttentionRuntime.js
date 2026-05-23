'use strict';

const { protectExecutiveAttention } = require('../fatigue/executiveAttentionProtection');
const { reduceBoardroomPressure } = require('./boardroomPressureReducer');
const { convergeExecutiveSignals } = require('./executiveSignalConvergence');

function runExecutiveAttentionOrchestration(payload = {}, fatigue = {}, usefulness = {}) {
  const attention = protectExecutiveAttention(payload);
  const pressure = reduceBoardroomPressure(payload);
  const convergence = convergeExecutiveSignals(payload);
  return {
    executive_orchestration_applied: payload.executive_cognitive_runtime?.consolidation_applied === true,
    attention,
    pressure,
    convergence,
    recommend_less_noise: attention.recommend_simplify || pressure.reduce_noise
  };
}

module.exports = { runExecutiveAttentionOrchestration };
