'use strict';

const { prepareOperationalActions } = require('../actions/zOperationalActionRuntime');
const { snapshotCognitiveState } = require('../cognition/zCognitiveStateRuntime');
const { inferOperationalIntent } = require('../cognition/zOperationalIntentRuntime');
const { computeAttention } = require('../cognition/zAttentionRuntime');
const { computeOperationalAwareness } = require('../cognition/zOperationalAwarenessRuntime');
const { fuseIndustrialCognition } = require('../cognition/zIndustrialCognitiveFusionRuntime');
const { buildContextualNarrative } = require('../cognition/zContextualNarrativeRuntime');

function runOperationalPipeline({ tenantId, user, message, continuity, context, reasoning }) {
  const actions = prepareOperationalActions({ message, continuity, context, reasoning });
  const intent = inferOperationalIntent(message);
  const attention = computeAttention({ continuity, reasoning, context });
  const awareness = computeOperationalAwareness({ context, continuity, reasoning });
  const fusion = fuseIndustrialCognition({ continuity, context, reasoning, actions, intent, attention, awareness });
  const narrative = buildContextualNarrative({ awareness, continuity, reasoning, actions, fusion });
  const state = snapshotCognitiveState({ continuity, context, reasoning, actions });

  return { actions, intent, attention, awareness, fusion, narrative, state };
}

module.exports = { runOperationalPipeline };
