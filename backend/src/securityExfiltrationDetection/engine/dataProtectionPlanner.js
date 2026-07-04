'use strict';

/**
 * SEC-17 — Data Protection Planner.
 * Sempre auto_execute: false.
 */

const store = require('../store/exfiltrationStore');
const metrics = require('../metrics/exfiltrationMetrics');
const flags = require('../config/securityExfiltrationFlags');

const PLAN_ACTIONS = Object.freeze([
  'protect_asset',
  'hide_resource',
  'monitor_continuously',
  'reinforce_audit',
  'manual_review',
  'preserve_evidence',
  'no_action'
]);

function planProtection(confidence, accessProfiles, suspiciousAssets) {
  const recs = [];
  const add = (action, reason, priority = 'MEDIUM', assetId = null) => {
    recs.push({ action, reason, priority, assetId });
  };

  const hasCritical = suspiciousAssets.some((a) => a.criticality === 'CRITICAL');
  const highConfidence = confidence.exfiltrationConfidence >= 0.6;
  const highScraping = confidence.scrapingConfidence >= 0.5;

  if (hasCritical && highConfidence) {
    add('protect_asset', 'Acesso a ativo CRITICAL com confiança elevada de exfiltração', 'CRITICAL');
    add('preserve_evidence', 'Preservar evidências forenses imediatamente', 'CRITICAL');
  }
  if (highScraping) {
    add('monitor_continuously', 'Scraping detectado — monitorização contínua recomendada', 'HIGH');
    add('reinforce_audit', 'Reforçar auditoria de acessos a ativos sensíveis', 'HIGH');
  }
  if (confidence.dataExposureRisk >= 0.5) {
    add('hide_resource', 'Risco de exposição — ocultar recursos sensíveis (fase futura)', 'HIGH');
  }
  if (confidence.exfiltrationConfidence >= 0.4 && confidence.exfiltrationConfidence < 0.6) {
    add('manual_review', 'Confiança moderada — revisão SOC recomendada', 'MEDIUM');
  }
  for (const ap of accessProfiles.filter((p) => p.anomalyScore >= 0.4).slice(0, 3)) {
    add('monitor_continuously', `Anomalia em ${ap.incidentId} — monitorizar ativos`, 'MEDIUM');
  }
  if (confidence.evidenceStrength >= 0.3) {
    add('preserve_evidence', 'Evidências suficientes — preservar timeline forense', 'MEDIUM');
  }

  if (recs.length === 0) {
    add('no_action', 'Sem indícios significativos de exfiltração nesta avaliação', 'INFO');
  }

  const seen = new Set();
  return recs.filter((r) => {
    const k = `${r.action}:${r.assetId || ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function createProtectionPlan(input) {
  const plan = {
    schema_version: 'data_protection_plan_v1',
    planId: `dpp-${Date.now()}-${String(input.action).replace(/[^a-z0-9-]/gi, '-')}`,
    action: input.action,
    planReason: input.reason,
    priority: input.priority || 'MEDIUM',
    assetId: input.assetId || null,
    auto_execute: false,
    executionAllowed: false,
    approvalRequired: flags.requireApproval(),
    mode: flags.dataProtectionMode(),
    disclaimer: 'SEC-17 — plano consultivo only, nenhum bloqueio de download',
    createdAt: new Date().toISOString()
  };

  store.addPlan(plan);
  metrics.increment('data_protection_plans');
  return plan;
}

function generateProtectionPlans(confidence, accessProfiles, suspiciousAssets) {
  const actions = planProtection(confidence, accessProfiles, suspiciousAssets);
  return actions.map((a) => createProtectionPlan(a));
}

module.exports = {
  PLAN_ACTIONS,
  planProtection,
  createProtectionPlan,
  generateProtectionPlans
};
