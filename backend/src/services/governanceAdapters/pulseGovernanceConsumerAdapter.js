'use strict';

/**
 * ECO-05 — Pulse Governance Consumer Adapter (ADR-ECO-002).
 * Pulse consome métricas EG; camada analítica — não decisória.
 */

const observability = require('../observabilityService');
const eventGovernanceExecution = require('../eventGovernanceExecutionService');
const ecoPulseFlags = require('../ecoPulseFlags');
const memoryIntegration = require('../governanceMemoryIntegrationService');
const explainability = require('../governanceExplainabilityService');
const intelligence = require('../governanceIntelligenceService');
const policyOptimization = require('../governancePolicyOptimizationService');
const confidenceService = require('../governanceConfidenceService');
const { normalizeSeverity } = require('../../governance/severityNormalizer');

const METRIC_EVENTS = 'eco_pulse_consumer_events';

/** @type {{ events: number }} */
const _stats = { events: 0 };

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function _safeRequire(relPath) {
  try {
    return require(relPath);
  } catch {
    return null;
  }
}

/**
 * Evento governável para snapshot analítico Pulse (políticas existentes; sem regra nova).
 * @param {string} companyId
 * @param {object} [context]
 */
function buildPulseGovernanceEvent(companyId, context = {}) {
  return {
    companyId,
    eventType: 'aioi_pulse_snapshot',
    category: 'aioi',
    severity: normalizeSeverity(context.severity || 'medium'),
    sourceModule: 'aioiInsightService',
    payload: {
      message: 'Pulse analytics snapshot',
      type: 'pulse_governance_snapshot',
      scope: context.scope || 'executive_dashboard',
      pulse_index: context.pulseIndex ?? null
    }
  };
}

/**
 * Métricas analíticas próprias do Pulse (paralelas).
 * @param {object} context
 */
function inferPulseParallelMetrics(context) {
  const executive = context.executiveDashboard || {};
  const base = context.baseDashboard || {};
  const insights = executive.cross_domain_insights || [];
  const insightConfidences = insights
    .map((i) => i.confidence)
    .filter((v) => Number.isFinite(v));

  const avgInsightConfidence = insightConfidences.length
    ? insightConfidences.reduce((a, b) => a + b, 0) / insightConfidences.length
    : null;

  return {
    confidence:
      executive.domain_states?.human?.confidence ??
      base.company_pulse?.confidence ??
      avgInsightConfidence,
    healthProxy: base.company_pulse?.pulse_index != null
      ? Math.round((base.company_pulse.pulse_index / 100) * 1000) / 1000
      : null,
    explainabilityProxy: null,
    analytics_own: true,
    pulse_index: base.company_pulse?.pulse_index ?? null
  };
}

/**
 * Consome métricas certificadas EG (read-only — não recalcula serviços EG).
 * @param {string} companyId
 * @param {object} event
 * @param {object} governanceResult
 */
function consumeGovernanceMetrics(companyId, event, governanceResult) {
  const evaluation = governanceResult?.evaluation || {};
  const decision = evaluation.decision || {};
  const policyId = decision.policyId || evaluation.policyId || null;

  const policyMatch = { id: policyId, category: event.category };
  const memoryContext = memoryIntegration.buildMemoryContext(event, policyMatch);

  const confidence = confidenceService.computeConfidenceScore({
    companyId,
    policyId: policyId || undefined
  });

  const explainAudit = explainability.getAuditStatus();
  const improvement = intelligence.buildImprovementReport
    ? intelligence.buildImprovementReport(companyId)
    : null;
  const optimization = policyOptimization.buildOptimizationReport
    ? policyOptimization.buildOptimizationReport(companyId)
    : null;

  const executiveInsights = _safeRequire('../governanceExecutiveInsightsService');
  let executiveKpis = null;
  let executiveIndicators = null;
  if (
    executiveInsights &&
    typeof executiveInsights.isExecutiveInsightsEnabled === 'function' &&
    executiveInsights.isExecutiveInsightsEnabled() &&
    typeof executiveInsights.buildExecutiveDashboard === 'function'
  ) {
    const execDash = executiveInsights.buildExecutiveDashboard(companyId);
    executiveKpis = execDash?.kpis ?? null;
    executiveIndicators = execDash?.indicators ?? null;
  }

  const learning = _safeRequire('../governanceLearningService');
  const learningAudit = learning?.getAuditStatus ? learning.getAuditStatus() : null;

  return {
    source: 'event_governance',
    recalculated: false,
    consumedAt: new Date().toISOString(),
    policyId,
    approved: evaluation.approved === true,
    confidence,
    memoryScore: memoryContext?.memoryScore ?? null,
    explainabilityScore: explainAudit.average_explainability_score ?? null,
    governanceHealthScore: improvement?.governanceHealthScore ?? null,
    policyEffectivenessScore: optimization?.averagePolicyEffectivenessScore ?? null,
    executiveKpis,
    executiveIndicators,
    learning: learningAudit
      ? {
          enabled: learningAudit.enabled,
          records_buffered: learningAudit.records_buffered
        }
      : null,
    layers: {
      learning: !!learningAudit?.enabled,
      memory: memoryContext != null,
      explainability: explainAudit.enabled === true,
      intelligence: improvement != null,
      policyOptimization: optimization != null,
      executiveInsights: executiveKpis != null
    }
  };
}

function _scoresComparable(a, b, tolerance = 0.2) {
  if (a == null || b == null) return true;
  return Math.abs(Number(a) - Number(b)) <= tolerance;
}

/**
 * Compara métricas Pulse vs EG (shadow).
 * @param {object} pulseMetrics
 * @param {object} govMetrics
 */
function compareShadow(pulseMetrics, govMetrics) {
  const confidenceMatch = _scoresComparable(pulseMetrics.confidence, govMetrics.confidence);
  const healthMatch = _scoresComparable(pulseMetrics.healthProxy, govMetrics.governanceHealthScore, 0.25);

  const match = confidenceMatch && healthMatch;

  return {
    match,
    pulse: pulseMetrics,
    governance: {
      confidence: govMetrics.confidence,
      governanceHealthScore: govMetrics.governanceHealthScore,
      memoryScore: govMetrics.memoryScore,
      explainabilityScore: govMetrics.explainabilityScore,
      policyEffectivenessScore: govMetrics.policyEffectivenessScore
    },
    divergence: match
      ? null
      : {
          confidence: !confidenceMatch,
          health: !healthMatch
        }
  };
}

/**
 * Enriquece resultado Pulse com analytics EG (consumer) ou shadow compare.
 * @param {string} companyId
 * @param {object} context — { baseDashboard, executiveDashboard }
 */
async function processPulseAnalytics(companyId, context = {}) {
  const started = Date.now();
  if (!companyId) {
    return { skipped: true, reason: 'missing_company_id' };
  }

  _stats.events += 1;
  _metric(METRIC_EVENTS);

  const consumerMode = ecoPulseFlags.isEcoPulseViaEg();
  const event = buildPulseGovernanceEvent(companyId, {
    pulseIndex: context.baseDashboard?.company_pulse?.pulse_index,
    scope: context.scope || 'executive_dashboard'
  });

  const pulseParallel = inferPulseParallelMetrics(context);

  let governanceResult;
  try {
    governanceResult = await eventGovernanceExecution.evaluatePrepareAndExecute(event);
  } catch (err) {
    console.warn('[pulseGovernanceConsumerAdapter][evaluate]', err?.message);
    ecoPulseFlags.recordObservation({
      mode: consumerMode ? 'consumer' : 'shadow',
      durationMs: Date.now() - started,
      ownAnalytics: true,
      match: false
    });
    return { mode: 'fallback', error: err?.message, pulseParallel };
  }

  const govMetrics = consumeGovernanceMetrics(companyId, event, governanceResult);

  if (!consumerMode) {
    const comparison = compareShadow(pulseParallel, govMetrics);
    ecoPulseFlags.recordObservation({
      mode: 'shadow',
      durationMs: Date.now() - started,
      match: comparison.match,
      ownAnalytics: true
    });

    return {
      mode: 'shadow',
      comparison,
      governanceResult,
      pulseParallel,
      governanceMetrics: govMetrics
    };
  }

  const reuseCount = [
    govMetrics.confidence,
    govMetrics.memoryScore,
    govMetrics.explainabilityScore,
    govMetrics.governanceHealthScore,
    govMetrics.policyEffectivenessScore,
    govMetrics.executiveKpis
  ].filter((v) => v != null).length;

  ecoPulseFlags.recordObservation({
    mode: 'consumer',
    durationMs: Date.now() - started,
    consumed: true,
    reuseRate: Math.round((reuseCount / 6) * 100)
  });

  return {
    mode: 'consumer',
    analytics: govMetrics,
    governanceResult,
    pulseParallel,
    analytics_source: 'event_governance',
    pulse_own_preserved: {
      pulse_index: pulseParallel.pulse_index,
      domain_states: context.executiveDashboard?.domain_states,
      cross_domain_insights: context.executiveDashboard?.cross_domain_insights
    }
  };
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  return {
    adapter: 'pulseGovernanceConsumerAdapter',
    adr: 'ADR-ECO-002',
    events_evaluated: _stats.events || metrics[METRIC_EVENTS] || 0,
    flag: ecoPulseFlags.getAuditStatus()
  };
}

function resetStatsForTests() {
  _stats.events = 0;
}

module.exports = {
  buildPulseGovernanceEvent,
  inferPulseParallelMetrics,
  consumeGovernanceMetrics,
  compareShadow,
  processPulseAnalytics,
  getAuditStatus,
  resetStatsForTests
};
