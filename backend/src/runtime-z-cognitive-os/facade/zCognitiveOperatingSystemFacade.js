'use strict';

const flags = require('../config/sz2FeatureFlags');
const obs = require('../observability/zCognitiveObservabilityRuntime');
const { orchestrateCognition } = require('../orchestration/zCognitiveOrchestrator');
const { evaluateGovernance } = require('../governance/zCognitiveGovernanceRuntime');
const { runShadowDiff } = require('../shadow/zOperationalShadowDiffRuntime');
const { applyCognitiveFallback } = require('../resilience/zCognitiveFallbackRuntime');
const { computeOperationalAccuracy } = require('../observability/zOperationalAccuracyMetrics');
const { computeContextContinuityMetrics } = require('../observability/zContextContinuityMetrics');
const { computeReasoningQualityMetrics } = require('../observability/zReasoningQualityMetrics');
const { computeOperationalAwarenessMetrics } = require('../observability/zOperationalAwarenessMetrics');

const conv = require('../memory/zConversationMemoryGraph');
const inc = require('../memory/zIncidentMemoryRuntime');
const taskMem = require('../memory/zTaskMemoryRuntime');
const wfMem = require('../memory/zWorkflowMemoryRuntime');
const entMem = require('../memory/zEntityMemoryRuntime');

/**
 * Resolve stage actual para tenant — SEMPRE manual, NUNCA auto-promove.
 */
function resolveStage(tenantId) {
  const stage = flags.defaultStage();
  const promotedList = flags.promotedTenants();
  if (tenantId && promotedList.includes(String(tenantId))) {
    return {
      stage: flags.promotedTenantStage(),
      tenant_promoted: true,
      auto_promotion: false
    };
  }
  return { stage, tenant_promoted: false, auto_promotion: false };
}

/**
 * Façade pública — usada por /api/runtime-z-cognitive-os/* e pelo dashboard.
 *
 * Em modo SHADOW (default), só observa. Em CONTEXT/OPERATIONAL ASSISTIVE,
 * disponibiliza inferências e PreparedActions para o frontend consumir.
 * Em STATEFUL_REASONING e COGNITIVE_SOVEREIGN, mantém memória persistente
 * em ciclos longos (mesma estrutura, só muda o consumo).
 */
function applyCognitiveOperatingSystem(user = {}, payloadFromZRuntime = {}, ctx = {}) {
  if (!flags.isEnabled()) {
    return { skipped: true, reason: 'sz2_disabled' };
  }

  const tenantId = ctx?.tenant_id || user?.company_id || null;
  const message = String(ctx?.message || '').trim();
  const stageInfo = resolveStage(tenantId);

  try {
    const cog = orchestrateCognition({ tenantId, user, message, payloadFromZRuntime });

    const governance = evaluateGovernance({ actions: cog.actions, stage: stageInfo.stage });

    const shadow = runShadowDiff({
      tenantId,
      message,
      continuity: cog.continuity,
      context: cog.context,
      reasoning: cog.reasoning,
      legacyHints: ctx?.legacyHints || {}
    });

    const operational_accuracy = computeOperationalAccuracy(cog.reasoning, cog.actions);
    const continuity_metrics = computeContextContinuityMetrics(cog.continuity);
    const reasoning_metrics = computeReasoningQualityMetrics(cog.reasoning);
    const awareness_metrics = computeOperationalAwarenessMetrics(cog.context, cog.awareness);

    obs.incApplied();
    if (shadow && !shadow.skipped) obs.incShadow();
    if (cog?.continuity?.inherited_context) obs.incInherited();
    if (cog?.actions?.count) obs.incActions(cog.actions.count);
    obs.updateScores({
      continuity_score: cog?.continuity?.continuation_score,
      reasoning_quality: cog?.reasoning?.reasoning_quality,
      industrial_intelligence_score: cog?.reasoning?.industrial_intelligence_score,
      awareness_score: cog?.context?.awareness_score,
      cognitive_density: cog?.fusion?.cognitive_density
    });
    if (cog?.continuity?.inherited_context) {
      obs.emit({ type: 'CONTEXT_RESTORED', tenant_id: tenantId });
    }
    if (cog?.actions?.count) {
      obs.emit({ type: 'ACTION_PREPARED', tenant_id: tenantId, count: cog.actions.count });
    }
    if (cog?.reasoning?.escalation?.suggested_escalation && cog.reasoning.escalation.suggested_escalation !== 'self') {
      obs.emit({ type: 'ESCALATION_INFERRED', tenant_id: tenantId, to: cog.reasoning.escalation.suggested_escalation });
    }
    if (cog?.context?.cross_domain?.multi_domain) {
      obs.emit({ type: 'CROSS_DOMAIN_CORRELATED', tenant_id: tenantId, count: cog.context.cross_domain.domain_count });
    }

    return {
      payload: {
        runtime_z_cognitive_os: {
          stage: stageInfo.stage,
          tenant_promoted: stageInfo.tenant_promoted,
          assistive_only: true,
          auto_execution: false,
          plc_control: false,
          human_authority_preserved: true,

          memory: cog.memory,
          continuity: cog.continuity,
          context: cog.context,
          reasoning: cog.reasoning,
          decision_support: cog.decision_support,
          actions: cog.actions,
          intent: cog.intent,
          attention: cog.attention,
          awareness: cog.awareness,
          fusion: cog.fusion,
          narrative: cog.narrative,
          cognitive_state: cog.state,
          governance,
          shadow,
          metrics: {
            operational_accuracy,
            ...continuity_metrics,
            ...reasoning_metrics,
            ...awareness_metrics,
            cognitive_density: cog?.fusion?.cognitive_density || 0
          }
        }
      },
      stageInfo,
      ok: true
    };
  } catch (err) {
    obs.incError();
    obs.emit({ type: 'SZ2_ERROR', message: err?.message });
    const fb = applyCognitiveFallback(tenantId, err);
    return {
      payload: {
        runtime_z_cognitive_os: {
          stage: stageInfo.stage,
          error: true,
          error_message: err?.message || 'sz2_unknown_error',
          fallback: fb,
          assistive_only: true,
          auto_execution: false,
          human_authority_preserved: true
        }
      },
      ok: false,
      stageInfo
    };
  }
}

/**
 * Helpers públicos para o lado de escrita (chat / dashboard chamarão isto
 * quando quiserem ensinar Z sobre o que aconteceu — sempre opt-in).
 */
function ingestConversationTurn(tenantId, user, turn) {
  if (!flags.isMemoryEnabled() || !tenantId) return { recorded: false };
  return conv.recordTurn(tenantId, user, turn || {});
}

function ingestIncident(tenantId, user, incident) {
  if (!flags.isMemoryEnabled() || !tenantId) return { recorded: false };
  return inc.recordIncident(tenantId, user, incident || {});
}

function ingestTask(tenantId, user, task) {
  if (!flags.isMemoryEnabled() || !tenantId) return { recorded: false };
  return taskMem.recordTask(tenantId, user, task || {});
}

function ingestWorkflow(tenantId, user, wf) {
  if (!flags.isMemoryEnabled() || !tenantId) return { recorded: false };
  return wfMem.recordWorkflow(tenantId, user, wf || {});
}

function ingestEntity(tenantId, user, entity) {
  if (!flags.isMemoryEnabled() || !tenantId) return { recorded: false };
  return entMem.recordEntity(tenantId, user, entity || {});
}

module.exports = {
  applyCognitiveOperatingSystem,
  resolveStage,
  ingestConversationTurn,
  ingestIncident,
  ingestTask,
  ingestWorkflow,
  ingestEntity,
  observability: obs
};
