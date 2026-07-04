'use strict';

/**
 * SEC-16 — Threat Deception Planner.
 * Sempre auto_execute: false.
 */

const store = require('../store/threatDeceptionStore');
const metrics = require('../metrics/threatDeceptionMetrics');
const flags = require('../config/securityThreatDeceptionFlags');

const PLAN_ACTIONS = Object.freeze([
  'present_fake_resource',
  'prolong_interaction',
  'mark_fingerprint',
  'increase_monitoring',
  'start_enhanced_collection',
  'no_action'
]);

function resolveDeceptionStatus(engagement, scenarios) {
  if (!scenarios.length) return 'INACTIVE';
  if (engagement.deceptionConfidence >= 0.75) return 'READY';
  if (engagement.deceptionConfidence >= 0.5) return 'CANDIDATE';
  if (scenarios.length > 0) return 'PLANNING';
  return 'INACTIVE';
}

function planDeceptionActions(scenarios, engagement, enrichment) {
  const recs = [];
  const add = (action, reason, priority = 'MEDIUM') => {
    recs.push({ action, reason, priority });
  };

  if (scenarios.some((s) => s.scenarioType === 'scanner_seeks_env')) {
    add('present_fake_resource', 'Apresentar fake_env quando activado (fase futura)', 'HIGH');
  }
  if (scenarios.some((s) => s.scenarioType === 'login_bruteforce')) {
    add('prolong_interaction', 'Prolongar interação em fake_admin para colecta', 'HIGH');
  }
  if (engagement.attackerPersistence >= 0.5) {
    add('mark_fingerprint', 'Marcar fingerprint do atacante persistente', 'MEDIUM');
  }
  if (engagement.scannerSophistication >= 0.4) {
    add('increase_monitoring', 'Aumentar monitorização SOC para scanner sofisticado', 'MEDIUM');
  }
  if (enrichment.evidenceGain >= 0.3) {
    add('start_enhanced_collection', 'Iniciar colecta reforçada de evidências SEC-02', 'MEDIUM');
  }
  if (scenarios.length >= 2) {
    add('present_fake_resource', 'Múltiplos cenários — biblioteca de perfis pronta', 'LOW');
  }

  if (recs.length === 0) {
    add('no_action', 'Sem candidatos de decepção significativos', 'INFO');
  }

  const seen = new Set();
  return recs.filter((r) => {
    if (seen.has(r.action)) return false;
    seen.add(r.action);
    return true;
  });
}

function createDeceptionPlan(input) {
  const plan = {
    schema_version: 'threat_deception_plan_v1',
    planId: `tdp-${Date.now()}-${String(input.scenarioId || 'global').replace(/[^a-z0-9-]/gi, '-')}`,
    scenarioId: input.scenarioId || null,
    action: input.action,
    planReason: input.reason,
    priority: input.priority || 'MEDIUM',
    fakeResourceRecommended: input.fakeResource || null,
    auto_execute: false,
    executionAllowed: false,
    approvalRequired: flags.requireApproval(),
    mode: flags.deceptionMode(),
    disclaimer: 'SEC-16 — plano certificado only, nenhum honeypot exposto',
    createdAt: new Date().toISOString()
  };

  store.addPlan(plan);
  metrics.increment('deception_plans');
  if (input.fakeResource) metrics.increment('fake_resource_recommendations');
  return plan;
}

function generateDeceptionPlans(scenarios, engagement, enrichment) {
  const actions = planDeceptionActions(scenarios, engagement, enrichment);
  const topScenario = scenarios[0] || null;

  return actions.map((a) => createDeceptionPlan({
    scenarioId: topScenario?.scenarioId,
    action: a.action,
    reason: a.reason,
    priority: a.priority,
    fakeResource: topScenario?.honeypotProfile?.profileId || null
  }));
}

module.exports = {
  PLAN_ACTIONS,
  resolveDeceptionStatus,
  planDeceptionActions,
  createDeceptionPlan,
  generateDeceptionPlans
};
