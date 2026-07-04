'use strict';

/**
 * SEC-06 — Response Orchestrator (orquestrador principal).
 * Consome SEC-05 notificações + SEC-02/03/04 read-only.
 */

const flags = require('../config/securityResponseFlags');
const store = require('../store/responseStore');
const metrics = require('../metrics/responseMetrics');
const { createSecurityResponseDto, freezeResponse } = require('../dto/securityResponseDto');
const { getCatalogEntry } = require('../catalog/actionCatalog');
const { buildAdaptiveProtectionPlan } = require('../catalog/adaptiveProtectionPlans');
const {
  resolveRecommendedLevel,
  resolveCatalogId,
  resolveCurrentMode,
  buildRecommendedActions
} = require('../engine/responseLevelResolver');
const { executeAssistAction, rollbackAssistActions } = require('../engine/assistExecutor');

function gatherContext(incidentId, notificationId) {
  let incident = null;
  let threatProfile = null;
  let integrityReport = null;
  let notification = null;

  try {
    const sec02 = require('../../securityCorrelation');
    if (incidentId) incident = sec02.store.getIncident(incidentId);
    if (!incident) {
      const all = sec02.store.getAllIncidents();
      incident = all[0] || null;
    }
  } catch (_e) {}

  try {
    const sec03 = require('../../securityThreatIntelligence');
    if (incident) threatProfile = sec03.store.getProfileByIncidentId(incident.incidentId);
  } catch (_e) {}

  try {
    const sec04 = require('../../securityRuntimeIntegrity');
    integrityReport = sec04.store.getLastReport();
  } catch (_e) {}

  try {
    const sec05 = require('../../securityNotification');
    if (notificationId) notification = sec05.store.getById(notificationId);
    if (!notification && incident) {
      notification = sec05.store.getAll().find((n) => n.incidentId === incident.incidentId) || null;
    }
  } catch (_e) {}

  return { incident, threatProfile, integrityReport, notification };
}

/**
 * Orquestra resposta para um incidente/notificação.
 * @param {object} opts
 * @returns {object|null}
 */
async function orchestrateResponse(opts = {}) {
  if (!flags.isSecurityResponseOrchestratorEnabled() && !opts.force) return null;

  const start = Date.now();
  metrics.increment('responses_generated');

  const context = gatherContext(opts.incidentId, opts.notificationId);
  const recommendedLevel = resolveRecommendedLevel(context);
  let currentMode = resolveCurrentMode(recommendedLevel);

  if (recommendedLevel === 'PROTECT') {
    currentMode = flags.protectModeEnabled() ? 'PROTECT' : 'ASSIST';
  }

  const catalogId = resolveCatalogId(recommendedLevel, context);
  const catalogEntry = getCatalogEntry(catalogId);

  const response = createSecurityResponseDto({
    incidentId: context.incident?.incidentId || null,
    notificationId: context.notification?.notificationId || null,
    recommendedLevel,
    currentMode,
    recommendedActions: buildRecommendedActions(catalogEntry, currentMode),
    catalogEntries: catalogEntry ? [catalogEntry] : [],
    approvalRequired: catalogEntry?.operator_required || recommendedLevel === 'PROTECT',
    rollbackAvailable: currentMode === 'ASSIST',
    operatorRequired: catalogEntry?.operator_required || false,
    executionStatus: 'pending',
    responseTimeline: [{ timestamp: new Date().toISOString(), phase: 'ORCHESTRATION_START', level: currentMode }]
  });

  if (recommendedLevel === 'PROTECT') {
    response.adaptiveProtectionPlan = buildAdaptiveProtectionPlan(context);
    response.executionStatus = 'planned';
    response.approvalRequired = true;
    response.responseTimeline.push({
      timestamp: new Date().toISOString(),
      phase: 'PROTECT_PLAN_GENERATED',
      detail: 'Protecção Adaptativa — plano apenas, zero execução automática'
    });
  }

  if (currentMode === 'OBSERVE') {
    response.executionStatus = 'completed';
    response.responseTimeline.push({ timestamp: new Date().toISOString(), phase: 'OBSERVE', detail: 'Registo apenas' });
  } else if (currentMode === 'ADVISE') {
    response.executionStatus = 'completed';
    response.responseTimeline.push({ timestamp: new Date().toISOString(), phase: 'ADVISE', detail: 'Recomendações emitidas' });
  } else if (currentMode === 'ASSIST') {
    await executeAssistBundle(response, catalogEntry, context);
  } else if (currentMode === 'PROTECT') {
    response.executionStatus = 'blocked';
    response.responseTimeline.push({
      timestamp: new Date().toISOString(),
      phase: 'PROTECT_BLOCKED',
      detail: 'Protect desabilitado — requer SECURITY_RESPONSE_PROTECT_ENABLED + aprovação humana'
    });
  }

  response.rollbackSteps = catalogEntry?.rollback ? [{ description: catalogEntry.rollback }] : [];
  response.updatedAt = new Date().toISOString();

  store.addResponse(response);
  metrics.recordLatency(Date.now() - start);

  return freezeResponse(response);
}

async function executeAssistBundle(response, catalogEntry, context) {
  const actions = catalogEntry?.assistActions || [];
  const executed = [];

  for (const actionId of actions) {
    const result = await executeAssistAction(actionId, context);
    executed.push(result);
    response.responseTimeline.push({
      timestamp: new Date().toISOString(),
      phase: 'ASSIST_ACTION',
      actionId,
      status: result.status
    });
  }

  response.executedActions = executed;
  response.executionStatus = executed.every((a) => a.status === 'completed') ? 'completed' : 'partial';
  response.reversible = true;
  response.rollbackAvailable = true;
  metrics.increment('responses_executed');
}

async function processPendingNotifications() {
  if (!flags.isSecurityResponseOrchestratorEnabled()) return [];

  let notifications = [];
  try {
    const sec05 = require('../../securityNotification');
    notifications = sec05.store.getPending();
  } catch (_e) {
    return [];
  }

  const results = [];
  for (const notif of notifications) {
    if (notif.severity === 'INFORMATION') continue;
    const existing = store.getByIncidentId(notif.incidentId);
    if (existing && Date.now() - new Date(existing.createdAt).getTime() < 3600000) continue;

    const resp = await orchestrateResponse({
      incidentId: notif.incidentId,
      notificationId: notif.notificationId
    });
    if (resp) results.push(resp);
  }
  return results;
}

function rollbackResponse(responseId) {
  const response = store.getById(responseId);
  if (!response) return null;

  const steps = rollbackAssistActions(response.executedActions);
  response.executionStatus = 'cancelled';
  response.responseTimeline.push({
    timestamp: new Date().toISOString(),
    phase: 'ROLLBACK',
    steps
  });
  response.updatedAt = new Date().toISOString();
  store.updateResponse(response);

  return freezeResponse(response);
}

module.exports = {
  orchestrateResponse,
  processPendingNotifications,
  rollbackResponse,
  gatherContext
};
