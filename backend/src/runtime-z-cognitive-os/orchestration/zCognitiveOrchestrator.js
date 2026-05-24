'use strict';

const { fuseMemory } = require('./zMemoryFusionPipeline');
const { assembleContext } = require('./zContextAssemblyPipeline');
const { fuseReasoning } = require('./zReasoningFusionPipeline');
const { runOperationalPipeline } = require('./zOperationalPipelineRuntime');

/**
 * Orquestrador principal — sequência cognitiva canónica:
 *
 *   memory_fusion → context_assembly → reasoning_fusion → operational_pipeline
 *
 * Cada passo é independente; falha de um não invalida os restantes.
 */
function orchestrateCognition({ tenantId, user = {}, message = '', payloadFromZRuntime = {} } = {}) {
  const memory = fuseMemory(tenantId);

  const ctxFirst = assembleContext({
    tenantId,
    user,
    message,
    payloadFromZRuntime,
    reasoning: null
  });

  const fused = fuseReasoning({
    tenantId,
    message,
    continuity: ctxFirst.continuity,
    context: ctxFirst.context
  });

  const ctx = assembleContext({
    tenantId,
    user,
    message,
    payloadFromZRuntime,
    reasoning: fused.reasoning
  });

  const operational = runOperationalPipeline({
    tenantId,
    user,
    message,
    continuity: ctx.continuity,
    context: ctx.context,
    reasoning: fused.reasoning
  });

  return {
    memory,
    continuity: ctx.continuity,
    context: ctx.context,
    reasoning: fused.reasoning,
    decision_support: fused.decision_support,
    actions: operational.actions,
    intent: operational.intent,
    attention: operational.attention,
    awareness: operational.awareness,
    fusion: operational.fusion,
    narrative: operational.narrative,
    state: operational.state
  };
}

module.exports = { orchestrateCognition };
