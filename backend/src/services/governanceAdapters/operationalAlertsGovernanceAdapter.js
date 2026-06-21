'use strict';

/**
 * EVENT-GOVERNANCE-04 — adapter Operational Alerts → Event Governance.
 * Substitui decisão local de distribuição; persistência de alertas permanece no produtor.
 */

const observability = require('../observabilityService');
const notificationBridge = require('../notificationBridgeService');
const eventGovernanceExecution = require('../eventGovernanceExecutionService');
const { normalizeSeverity } = require('../../governance/severityNormalizer');

const METRIC_EVENTS = 'event_governance_operational_events';
const METRIC_MIGRATED = 'event_governance_operational_migrated';
const METRIC_SHADOW_TOTAL = 'event_governance_operational_shadow_total';
const METRIC_SHADOW_MATCH = 'event_governance_operational_shadow_match';
const METRIC_SHADOW_DIVERGENCE = 'event_governance_operational_shadow_divergence';

/** Canais já satisfeitos pelo INSERT em operational_alerts. */
const SKIP_CHANNELS_ON_EXECUTE = new Set(['dashboard', 'operational_alerts']);

/** @type {{ events_evaluated: number, matches: number, divergences: number, migrated: number }} */
const _stats = {
  events_evaluated: 0,
  matches: 0,
  divergences: 0,
  migrated: 0
};

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function isOperationalAlertsGovernanceEnabled() {
  return String(process.env.EVENT_GOVERNANCE_OPERATIONAL_ALERTS || '').toLowerCase() === 'true';
}

/**
 * @param {object} input
 * @returns {object}
 */
function buildGovernanceEvent(input) {
  const companyId = input.companyId;
  const severity = input.severity || input.severidade || 'media';
  const title = input.title || input.titulo || 'Alerta operacional';
  const description = input.description || input.mensagem || input.message || '';

  return {
    companyId,
    eventType: input.eventType || input.tipo_alerta || 'operational_alert',
    category: input.category || 'operational',
    severity,
    sourceModule: 'operationalAlertsService',
    payload: {
      title,
      titulo: title,
      message: description,
      mensagem: description,
      tipo_alerta: input.tipo_alerta || input.eventType || 'operational_alert',
      metadata: input.metadata || {},
      type: 'operational_alert_governance'
    }
  };
}

/**
 * Distribuição legada inferida (NC-03 bridge + dashboard via INSERT).
 * @param {object} alert
 */
function inferLegacyDistribution(alert) {
  const severidade = alert.severidade || alert.severity || 'media';
  const normalized = normalizeSeverity(severidade);
  const channels = ['dashboard', 'operational_alerts'];
  const bridgeEligible = notificationBridge.isOperationalSeverityEligible(severidade);

  if (bridgeEligible) {
    channels.push('notification_center');
  }

  let escalationLevel = 0;
  if (normalized === 'critical' || normalized === 'high') escalationLevel = 2;
  else if (normalized === 'medium') escalationLevel = 1;

  return {
    severity: normalized,
    channels: [...new Set(channels)],
    escalationLevel,
    bridgeEligible
  };
}

function _expandChannelAliases(channels) {
  const set = new Set(channels || []);
  if (set.has('dashboard')) set.add('operational_alerts');
  if (set.has('operational_alerts')) set.add('dashboard');
  return set;
}

function _channelsEqual(a, b) {
  const setA = _expandChannelAliases(a);
  const setB = _expandChannelAliases(b);
  if (setA.size !== setB.size) return false;
  for (const ch of setA) {
    if (!setB.has(ch)) return false;
  }
  return true;
}

/**
 * Compara legado vs decisão governance (shadow).
 * @param {object} legacy
 * @param {object} governanceResult — evaluatePrepareAndExecute output
 */
function compareShadow(legacy, governanceResult) {
  const evaluation = governanceResult.evaluation || {};
  const execution = governanceResult.execution || {};
  const decision = evaluation.decision || {};

  const govChannels = execution.channelsReady?.length
    ? execution.channelsReady
    : evaluation.channels || decision.channels || [];

  const govSeverity = decision.severity || normalizeSeverity(legacy.severity);
  const govPolicy = evaluation.policyId || decision.policyId || null;
  const govEscalation = decision.escalationLevel ?? evaluation.escalationLevel ?? 0;

  const severityMatch = legacy.severity === govSeverity;
  const channelsMatch = _channelsEqual(legacy.channels, govChannels);
  const escalationMatch = legacy.escalationLevel === govEscalation;

  const match = evaluation.approved === true && severityMatch && channelsMatch && escalationMatch;

  return {
    match,
    legacy: {
      severity: legacy.severity,
      channels: legacy.channels,
      escalationLevel: legacy.escalationLevel
    },
    governance: {
      policyId: govPolicy,
      severity: govSeverity,
      channels: govChannels,
      escalationLevel: govEscalation,
      approved: evaluation.approved
    },
    divergence: match
      ? null
      : {
          severity: !severityMatch,
          channels: !channelsMatch,
          escalation: !escalationMatch,
          policy: !govPolicy || govPolicy === 'UNMATCHED'
        }
  };
}

function _formatNcMessage(alert) {
  const titulo = alert.titulo || alert.title || alert.tipo_alerta || 'Alerta operacional';
  const mensagem = alert.mensagem || alert.message || '';
  return `[Alerta operacional] ${titulo}${mensagem ? `\n${mensagem}` : ''}`.slice(0, 4000);
}

function _filterExecutionPlan(executionPlan) {
  return (executionPlan || []).filter(
    (step) => step.validationPassed && !SKIP_CHANNELS_ON_EXECUTE.has(step.channel)
  );
}

/**
 * Executa distribuição via governance (modo migrado).
 */
async function _executeGovernanceDistribution(companyId, alert, governanceResult) {
  const steps = _filterExecutionPlan(governanceResult.execution?.executionPlan);
  if (!steps.length) {
    return { executed: 0, steps: [] };
  }

  const message = _formatNcMessage(alert);
  const results = [];

  for (const step of steps) {
    if (step.channel === 'notification_center') {
      const userIds = await notificationBridge.findSupervisorNcRecipients(companyId);
      for (const userId of userIds) {
        const r = await eventGovernanceExecution.executePlan({
          executable: true,
          executionPlan: [step],
          decisionRef: governanceResult.execution.decisionRef,
          companyId,
          payload: {
            message,
            userId,
            type: 'operational_alert_governance'
          }
        });
        results.push(r);
      }
    } else {
      const r = await eventGovernanceExecution.executePlan({
        executable: true,
        executionPlan: [step],
        decisionRef: governanceResult.execution.decisionRef,
        companyId,
        payload: {
          message,
          title: alert.titulo || alert.title,
          titulo: alert.titulo || alert.title,
          mensagem: alert.mensagem || alert.message,
          tipo_alerta: alert.tipo_alerta,
          type: 'operational_alert_governance'
        }
      });
      results.push(r);
    }
  }

  return { executed: results.length, results };
}

/**
 * Ponto de entrada após persistência de alerta operacional.
 * @param {string} companyId
 * @param {object} alert — { severidade, titulo, mensagem, tipo_alerta, ... }
 */
async function dispatchOperationalAlert(companyId, alert) {
  if (!companyId || !alert) {
    return { skipped: true, reason: 'missing_params' };
  }

  _stats.events_evaluated += 1;
  _metric(METRIC_EVENTS);

  const event = buildGovernanceEvent({ companyId, ...alert });
  const legacy = inferLegacyDistribution(alert);
  const migrated = isOperationalAlertsGovernanceEnabled();

  const governanceResult = await eventGovernanceExecution.evaluatePrepareAndExecute(event);

  if (!migrated) {
    _metric(METRIC_SHADOW_TOTAL);
    const comparison = compareShadow(legacy, governanceResult);

    if (comparison.match) {
      _stats.matches += 1;
      _metric(METRIC_SHADOW_MATCH);
    } else {
      _stats.divergences += 1;
      _metric(METRIC_SHADOW_DIVERGENCE);
    }

    if (legacy.bridgeEligible) {
      await notificationBridge.bridgeOperationalAlert(companyId, alert);
    }

    return {
      mode: 'shadow',
      comparison,
      governanceResult
    };
  }

  _stats.migrated += 1;
  _metric(METRIC_MIGRATED);

  const distribution = await _executeGovernanceDistribution(companyId, alert, governanceResult);

  return {
    mode: 'governance',
    governanceResult,
    distribution
  };
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const enabled = isOperationalAlertsGovernanceEnabled();

  return {
    enabled,
    shadow_mode: !enabled,
    events_evaluated: _stats.events_evaluated || metrics[METRIC_EVENTS] || 0,
    matches: _stats.matches || metrics[METRIC_SHADOW_MATCH] || 0,
    divergences: _stats.divergences || metrics[METRIC_SHADOW_DIVERGENCE] || 0,
    migrated_events: _stats.migrated || metrics[METRIC_MIGRATED] || 0,
    shadow_total: metrics[METRIC_SHADOW_TOTAL] || 0
  };
}

function resetStatsForTests() {
  _stats.events_evaluated = 0;
  _stats.matches = 0;
  _stats.divergences = 0;
  _stats.migrated = 0;
}

module.exports = {
  isOperationalAlertsGovernanceEnabled,
  buildGovernanceEvent,
  inferLegacyDistribution,
  compareShadow,
  dispatchOperationalAlert,
  getAuditStatus,
  resetStatsForTests,
  METRIC_EVENTS,
  METRIC_MIGRATED,
  METRIC_SHADOW_TOTAL,
  METRIC_SHADOW_MATCH,
  METRIC_SHADOW_DIVERGENCE
};
