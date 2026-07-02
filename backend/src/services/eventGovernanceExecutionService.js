'use strict';

/**
 * EVENT-GOVERNANCE-02/03 — plano e execução centralizados de governança de eventos.
 * EG-02: prepareExecution (plano). EG-03: executePlan (executores reais, flag-gated).
 */

const observability = require('./observabilityService');
const eventGovernance = require('./eventGovernanceService');
const { buildExecutionContract } = require('../governance/governanceExecutionContract');
const {
  getRegisteredChannelCount,
  getReadyChannelCount,
  resolveChannelDefinition
} = require('../governance/channelRegistry');
const { resolveExecutor, getExecutorCount } = require('../governance/executorRegistry');

const METRIC_PLANS = 'event_governance_execution_plans';
const METRIC_CHANNELS_READY = 'event_governance_channels_ready';
const METRIC_CHANNELS_UNAVAILABLE = 'event_governance_channels_unavailable';
const METRIC_ATTEMPTS = 'event_governance_execution_attempts';
const METRIC_SUCCESS = 'event_governance_execution_success';
const METRIC_FAILURES = 'event_governance_execution_failures';
const METRIC_LATENCY = 'event_governance_execution_latency_ms';

/** @type {{ execution_plans: number, channels_ready: number, channels_unavailable: number, executions: number, success: number, failures: number }} */
const _stats = {
  execution_plans: 0,
  channels_ready: 0,
  channels_unavailable: 0,
  executions: 0,
  success: 0,
  failures: 0
};

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function isEnabled() {
  return eventGovernance.isEnabled();
}

function isExecutionEnabled() {
  return String(process.env.EVENT_GOVERNANCE_EXECUTION_ENABLED || '').toLowerCase() === 'true';
}

/**
 * Relatório de capacidade por canal registado.
 * @returns {object[]}
 */
function getChannelCapabilities() {
  const coreChannels = ['notification_center', 'app_impetus', 'email', 'dashboard', 'chat'];

  return coreChannels.map((channelId) => {
    const resolved = resolveChannelDefinition(channelId);
    const definition = resolved.definition;
    return {
      channel: channelId,
      available: definition?.available === true,
      executor_defined: typeof definition?.executor === 'string' && definition.executor.length > 0,
      executor: definition?.executor || null
    };
  });
}

/**
 * Valida decisão e produz plano de execução (sem envio).
 * @param {object} decision — GovernanceDecisionDto
 * @returns {object}
 */
function prepareExecution(decision) {
  if (!decision || typeof decision !== 'object') {
    return {
      executable: false,
      channelsReady: [],
      channelsUnavailable: [],
      executionPlan: [],
      error: 'decision obrigatório'
    };
  }

  const channels = Array.isArray(decision.channels) ? decision.channels : [];
  const policyId = String(decision.policyId || '');

  if (policyId === 'UNMATCHED' || channels.length === 0) {
    return {
      executable: false,
      channelsReady: [],
      channelsUnavailable: channels.map((ch) =>
        buildExecutionContract({ channel: ch })
      ),
      executionPlan: [],
      decisionRef: {
        eventId: decision.eventId,
        policyId: decision.policyId || 'UNMATCHED'
      }
    };
  }

  _stats.execution_plans += 1;
  _metric(METRIC_PLANS);

  const channelsReady = [];
  const channelsUnavailable = [];
  const executionPlan = [];

  for (const rawChannel of channels) {
    const contract = buildExecutionContract({ channel: rawChannel });

    if (contract.validationPassed) {
      channelsReady.push(contract.channel);
      _stats.channels_ready += 1;
      _metric(METRIC_CHANNELS_READY);

      executionPlan.push(
        Object.freeze({
          channel: contract.channel,
          executor: contract.executor,
          available: contract.available,
          validationPassed: contract.validationPassed,
          escalationLevel: Number.isFinite(decision.escalationLevel) ? decision.escalationLevel : 0,
          recipients: Array.isArray(decision.recipients)
            ? decision.recipients.map((r) => ({ ...r }))
            : [],
          aliasOf: contract.aliasOf || null
        })
      );
    } else {
      channelsUnavailable.push(contract.channel);
      _stats.channels_unavailable += 1;
      _metric(METRIC_CHANNELS_UNAVAILABLE);
      executionPlan.push(
        Object.freeze({
          channel: contract.channel,
          executor: contract.executor,
          available: contract.available,
          validationPassed: false,
          escalationLevel: Number.isFinite(decision.escalationLevel) ? decision.escalationLevel : 0,
          recipients: [],
          aliasOf: contract.aliasOf || null,
          reason: contract.supported ? 'channel_unavailable' : 'channel_not_registered'
        })
      );
    }
  }

  const uniqueReady = [...new Set(channelsReady)];

  return {
    executable: uniqueReady.length > 0,
    channelsReady: uniqueReady,
    channelsUnavailable: [...new Set(channelsUnavailable)],
    executionPlan,
    decisionRef: Object.freeze({
      eventId: decision.eventId,
      eventType: decision.eventType,
      policyId: decision.policyId,
      severity: decision.severity,
      generatedAt: decision.generatedAt
    })
  };
}

/**
 * Pipeline completo: evento → decisão → plano (somente plano).
 * @param {object} event
 * @returns {object}
 */
function evaluateAndPrepare(event) {
  const evaluation = eventGovernance.evaluateEvent(event);
  const plan = prepareExecution(evaluation.decision || {});
  return {
    evaluation,
    execution: plan
  };
}

/**
 * Executa plano via registry de executores (dry-run quando flag off).
 * @param {object} planBundle — saída de prepareExecution + companyId + payload
 * @returns {Promise<object>}
 */
async function executePlan(planBundle) {
  const started = Date.now();

  if (!planBundle || typeof planBundle !== 'object') {
    return {
      success: false,
      channelsExecuted: [],
      channelsFailed: [],
      error: 'planBundle obrigatório'
    };
  }

  const { executable, executionPlan, decisionRef } = planBundle;
  const companyId = planBundle.companyId;
  const payload = planBundle.payload || {};

  if (!executable || !Array.isArray(executionPlan) || executionPlan.length === 0) {
    return {
      success: false,
      channelsExecuted: [],
      channelsFailed: [],
      error: 'plan_not_executable',
      decisionRef
    };
  }

  if (!companyId) {
    return {
      success: false,
      channelsExecuted: [],
      channelsFailed: [],
      error: 'companyId obrigatório'
    };
  }

  _stats.executions += 1;
  _metric(METRIC_ATTEMPTS);

  const dryRun = !isExecutionEnabled();
  const channelsExecuted = [];
  const channelsFailed = [];
  const stepResults = [];

  for (const step of executionPlan) {
    if (!step.validationPassed) {
      channelsFailed.push(step.channel);
      stepResults.push({
        channel: step.channel,
        executor: step.executor,
        ok: false,
        skipped: true,
        reason: step.reason || 'validation_failed'
      });
      continue;
    }

    const executorMod = resolveExecutor(step.executor);
    if (!executorMod || typeof executorMod.execute !== 'function') {
      channelsFailed.push(step.channel);
      _stats.failures += 1;
      _metric(METRIC_FAILURES);
      stepResults.push({
        channel: step.channel,
        executor: step.executor,
        ok: false,
        error: 'executor_not_found'
      });
      continue;
    }

    try {
      const result = await executorMod.execute({
        companyId,
        payload,
        recipients: step.recipients || [],
        decisionRef,
        escalationLevel: step.escalationLevel ?? 0,
        dryRun
      });

      if (result.ok) {
        channelsExecuted.push(step.channel);
        stepResults.push(result);
      } else {
        channelsFailed.push(step.channel);
        _stats.failures += 1;
        _metric(METRIC_FAILURES);
        stepResults.push(result);
      }
    } catch (err) {
      channelsFailed.push(step.channel);
      _stats.failures += 1;
      _metric(METRIC_FAILURES);
      stepResults.push({
        channel: step.channel,
        executor: step.executor,
        ok: false,
        error: err?.message || 'execution_error'
      });
    }
  }

  const latencyMs = Date.now() - started;
  _metric(METRIC_LATENCY, latencyMs);

  const success = channelsExecuted.length > 0 && channelsFailed.length === 0;
  if (success || (dryRun && channelsExecuted.length > 0)) {
    _stats.success += 1;
    _metric(METRIC_SUCCESS);
  }

  return {
    success: dryRun ? channelsExecuted.length > 0 : success,
    dryRun,
    channelsExecuted: [...new Set(channelsExecuted)],
    channelsFailed: [...new Set(channelsFailed)],
    executionPlan: stepResults,
    latencyMs,
    decisionRef
  };
}

/**
 * Pipeline completo: evento → decisão → plano → execução.
 * @param {object} event
 * @returns {Promise<object>}
 */
async function evaluatePrepareAndExecute(event) {
  const { evaluation, execution } = evaluateAndPrepare(event);
  const execResult = await executePlan({
    ...execution,
    companyId: event.companyId,
    payload: event.payload || {}
  });
  const result = { evaluation, execution, execResult };

  let aioiResult = null;
  try {
    const aioiIntegration = require('./aioiGovernanceIntegrationService');
    aioiResult = await aioiIntegration.onGovernedEvent(event, result);
  } catch (err) {
    console.warn('[eventGovernanceExecution][aioi_integration]', err?.message ?? err);
  }

  try {
    const learningIntegration = require('./governanceLearningIntegrationService');
    await learningIntegration.onGovernanceExecution(event, result);
  } catch (err) {
    console.warn('[eventGovernanceExecution][learning_integration]', err?.message ?? err);
  }

  try {
    const memoryIntegration = require('./governanceMemoryIntegrationService');
    memoryIntegration.registerFromExecution(event, result);
  } catch (err) {
    console.warn('[eventGovernanceExecution][memory_integration]', err?.message ?? err);
  }

  try {
    const explainability = require('./governanceExplainabilityService');
    explainability.enrichResult(event, result, { aioiResult });
  } catch (err) {
    console.warn('[eventGovernanceExecution][explainability]', err?.message ?? err);
  }

  try {
    const intelligence = require('./governanceIntelligenceService');
    intelligence.recordPipelineSnapshot(event, result);
    if (intelligence.isIntelligenceEnabled()) {
      intelligence.runIntelligenceCycle(event.companyId);
    }
  } catch (err) {
    console.warn('[eventGovernanceExecution][intelligence]', err?.message ?? err);
  }

  try {
    const policyOpt = require('./governancePolicyOptimizationService');
    policyOpt.recordPolicyObservation(event, result);
    if (policyOpt.isPolicyOptimizationEnabled()) {
      policyOpt.runOptimizationCycle(event.companyId);
    }
  } catch (err) {
    console.warn('[eventGovernanceExecution][policy_optimization]', err?.message ?? err);
  }

  return result;
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  return {
    enabled: isEnabled(),
    registered_channels: getRegisteredChannelCount(),
    ready_channels: getReadyChannelCount(),
    execution_plans: _stats.execution_plans || metrics[METRIC_PLANS] || 0,
    channels_ready_total: _stats.channels_ready || metrics[METRIC_CHANNELS_READY] || 0,
    channels_unavailable_total: _stats.channels_unavailable || metrics[METRIC_CHANNELS_UNAVAILABLE] || 0,
    capabilities: getChannelCapabilities()
  };
}

function getExecutorsAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  return {
    enabled: isExecutionEnabled(),
    dry_run: !isExecutionEnabled(),
    executors_registered: getExecutorCount(),
    executions: _stats.executions || metrics[METRIC_ATTEMPTS] || 0,
    success: _stats.success || metrics[METRIC_SUCCESS] || 0,
    failures: _stats.failures || metrics[METRIC_FAILURES] || 0,
    latency_ms_total: metrics[METRIC_LATENCY] || 0
  };
}

function resetStatsForTests() {
  _stats.execution_plans = 0;
  _stats.channels_ready = 0;
  _stats.channels_unavailable = 0;
  _stats.executions = 0;
  _stats.success = 0;
  _stats.failures = 0;
}

module.exports = {
  prepareExecution,
  evaluateAndPrepare,
  executePlan,
  evaluatePrepareAndExecute,
  getChannelCapabilities,
  getAuditStatus,
  getExecutorsAuditStatus,
  isEnabled,
  isExecutionEnabled,
  resetStatsForTests,
  METRIC_PLANS,
  METRIC_CHANNELS_READY,
  METRIC_CHANNELS_UNAVAILABLE,
  METRIC_ATTEMPTS,
  METRIC_SUCCESS,
  METRIC_FAILURES,
  METRIC_LATENCY
};
