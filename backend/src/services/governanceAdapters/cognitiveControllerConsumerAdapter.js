'use strict';

/**
 * ECO-04 — Cognitive Controller Consumer Adapter (ADR-ECO-001).
 * Controller consome decisões Event Governance v1; não recalcula em modo consumer.
 */

const observability = require('../observabilityService');
const eventGovernanceExecution = require('../eventGovernanceExecutionService');
const ecoControllerFlags = require('../ecoControllerFlags');
const memoryIntegration = require('../governanceMemoryIntegrationService');
const explainability = require('../governanceExplainabilityService');
const intelligence = require('../governanceIntelligenceService');
const learning = require('../governanceLearningService');
const { normalizeSeverity } = require('../../governance/severityNormalizer');

const METRIC_EVENTS = 'eco_controller_consumer_events';

/** @type {{ events: number, blocked: number, allowed: number }} */
const _stats = { events: 0, blocked: 0, allowed: 0 };

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function inferSeverity(message, module) {
  const t = String(message || '').toLowerCase();
  if (/\b(critical|crítico|emerg(ê|e)ncia|parada|inc(ê|e)ndio)\b/.test(t)) return 'critical';
  if (/\b(alto|high|urgente|falha grave)\b/.test(t)) return 'high';
  if (module === 'environmental') return 'medium';
  return 'medium';
}

/**
 * Mapeia pedido cognitivo → evento governável (políticas existentes; sem regra nova).
 * @param {object} input
 */
function buildControllerGovernanceEvent(input) {
  const { user, message, module, traceId } = input;
  const mod = module || 'cognitive_council';
  const severity = normalizeSeverity(input.severity || inferSeverity(message, mod));

  if (mod === 'environmental') {
    return {
      companyId: user.company_id,
      eventType: 'operational_event',
      category: 'operational',
      severity,
      sourceModule: 'operationalRealtimeCoordinator',
      payload: {
        message: String(message || '').slice(0, 4000),
        userId: user.id,
        traceId,
        module: mod,
        type: 'cognitive_environmental'
      }
    };
  }

  return {
    companyId: user.company_id,
    eventType: 'ai_proactive',
    category: 'ai',
    severity,
    sourceModule: 'proactiveAI',
    payload: {
      message: String(message || '').slice(0, 4000),
      userId: user.id,
      recipientUserId: user.id,
      traceId,
      module: mod,
      type: 'cognitive_request'
    }
  };
}

/**
 * Decisão paralela actual (pipeline sensor + intent).
 * @param {object} input
 */
function inferParallelDecision(input) {
  const pipelineGovernance = input.pipelineGovernance || {};
  const conflict = !!input.intentConflict;
  const allowCouncil =
    pipelineGovernance.allow !== false &&
    pipelineGovernance.block !== true &&
    !conflict;

  return {
    allowCouncil,
    intent: input.controllerIntent || null,
    pipelineIntent: input.pipelineIntent || null,
    conflict,
    confidence: input.confidence ?? null,
    degraded: pipelineGovernance.degraded === true
  };
}

function compareShadow(parallel, governanceResult) {
  const evaluation = governanceResult.evaluation || {};
  const decision = evaluation.decision || {};
  const policyId = evaluation.policyId || decision.policyId || null;
  const govAllow = evaluation.approved === true && policyId !== 'UNMATCHED';
  const match = parallel.allowCouncil === govAllow;

  return {
    match,
    parallel,
    governance: {
      approved: evaluation.approved === true,
      policyId,
      allowCouncil: govAllow,
      channels: decision.channels || evaluation.channels || [],
      escalationLevel: decision.escalationLevel ?? evaluation.escalationLevel ?? 0
    },
    divergence: match
      ? null
      : {
          allowCouncil: parallel.allowCouncil !== govAllow,
          policy: !policyId || policyId === 'UNMATCHED'
        }
  };
}

/**
 * Consome camadas cognitivas certificadas (read-only; não altera serviços EG).
 * @param {object} event
 * @param {object} governanceResult
 */
function consumeCognitiveLayers(event, governanceResult) {
  const evaluation = governanceResult.evaluation || {};
  const decision = evaluation.decision || {};
  const policyMatch = {
    id: decision.policyId || evaluation.policyId,
    category: event.category
  };

  const memoryContext = memoryIntegration.buildMemoryContext(event, policyMatch);
  const explanation = explainability.buildExplanation(event, governanceResult, {
    memory: memoryContext
  });
  const learningRecords = learning.getRecords
    ? learning.getRecords(event.companyId, policyMatch.id, null)
    : [];
  const improvementReport = intelligence.buildImprovementReport
    ? intelligence.buildImprovementReport(event.companyId)
    : null;

  return {
    decisionContext: {
      eventId: decision.eventId || event.eventId,
      policyId: policyMatch.id,
      approved: evaluation.approved === true,
      severity: decision.severity || event.severity,
      channels: decision.channels || evaluation.channels || [],
      escalationLevel: decision.escalationLevel ?? 0,
      execution: governanceResult.execution
        ? {
            executable: governanceResult.execution.executable,
            channelsReady: governanceResult.execution.channelsReady || []
          }
        : null
    },
    learning: {
      records: Array.isArray(learningRecords) ? learningRecords.slice(-5) : [],
      audit: learning.getAuditStatus ? learning.getAuditStatus() : null
    },
    memory: memoryContext,
    explainability: explanation,
    intelligence: improvementReport
      ? {
          governanceHealthScore: improvementReport.governanceHealthScore,
          recommendations: (improvementReport.recommendations || []).slice(0, 3)
        }
      : null,
    consumedAt: new Date().toISOString(),
    recalculated: false
  };
}

function buildBlockedResponse(consumerContext, traceId) {
  _stats.blocked += 1;
  return {
    blockCouncil: true,
    blockedResponse: {
      ok: false,
      trace_id: traceId || null,
      error: {
        code: 'GOVERNANCE_DENIED',
        message: 'Pedido bloqueado pela governança de eventos (Controller Consumer).',
        stage: 'governance_consumer',
        policyId: consumerContext?.decisionContext?.policyId || null
      },
      governance_consumer: {
        mode: 'consumer',
        policyId: consumerContext?.decisionContext?.policyId,
        explainabilityScore: consumerContext?.explainability?.explainabilityScore
      }
    }
  };
}

/**
 * Ponto de entrada ECO-04 — shadow ou consumer.
 * @param {object} input
 */
async function processControllerRequest(input) {
  const started = Date.now();
  const { user, traceId } = input;

  if (!user?.company_id) {
    return { blockCouncil: false, skipped: true, reason: 'invalid_user' };
  }

  _stats.events += 1;
  _metric(METRIC_EVENTS);

  const event = buildControllerGovernanceEvent(input);
  const parallel = inferParallelDecision(input);
  const consumerMode = ecoControllerFlags.isEcoControllerViaEg();

  let governanceResult;
  try {
    governanceResult = await eventGovernanceExecution.evaluatePrepareAndExecute(event);
  } catch (err) {
    console.warn('[cognitiveControllerConsumerAdapter][evaluate]', err?.message);
    ecoControllerFlags.recordObservation({
      mode: consumerMode ? 'consumer' : 'shadow',
      durationMs: Date.now() - started,
      parallel: true,
      match: false
    });
    return { blockCouncil: false, error: err?.message, fallbackParallel: true };
  }

  const policyId =
    governanceResult.evaluation?.policyId ||
    governanceResult.evaluation?.decision?.policyId ||
    null;

  if (!consumerMode) {
    const comparison = compareShadow(parallel, governanceResult);
    ecoControllerFlags.recordObservation({
      mode: 'shadow',
      durationMs: Date.now() - started,
      match: comparison.match,
      policyId,
      parallel: !comparison.match
    });

    return {
      blockCouncil: false,
      mode: 'shadow',
      comparison,
      governanceResult,
      parallel,
      policyId
    };
  }

  const consumerContext = consumeCognitiveLayers(event, governanceResult);
  const approved = consumerContext.decisionContext.approved === true;
  const allowCouncil =
    approved &&
    consumerContext.decisionContext.policyId &&
    consumerContext.decisionContext.policyId !== 'UNMATCHED';

  ecoControllerFlags.recordObservation({
    mode: 'consumer',
    durationMs: Date.now() - started,
    policyId,
    consumed: allowCouncil,
    parallel: false,
    latencySavedMs: parallel.allowCouncil && !allowCouncil ? 0 : undefined
  });

  if (!allowCouncil) {
    return buildBlockedResponse(consumerContext, traceId);
  }

  _stats.allowed += 1;
  return {
    blockCouncil: false,
    mode: 'consumer',
    consumerContext,
    governanceResult,
    policyId,
    skipUnifiedDecision: true
  };
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  return {
    adapter: 'cognitiveControllerConsumerAdapter',
    adr: 'ADR-ECO-001',
    events_evaluated: _stats.events || metrics[METRIC_EVENTS] || 0,
    council_blocked: _stats.blocked,
    council_allowed: _stats.allowed,
    flag: ecoControllerFlags.getAuditStatus()
  };
}

function resetStatsForTests() {
  _stats.events = 0;
  _stats.blocked = 0;
  _stats.allowed = 0;
}

module.exports = {
  buildControllerGovernanceEvent,
  inferParallelDecision,
  compareShadow,
  consumeCognitiveLayers,
  processControllerRequest,
  getAuditStatus,
  resetStatsForTests
};
