'use strict';

/**
 * SEC-18 — Adaptive Protection Planner.
 * Sempre auto_execute: false.
 */

const store = require('../store/runtimeProtectionStore');
const metrics = require('../metrics/runtimeProtectionMetrics');
const flags = require('../config/securityRuntimeProtectionFlags');

const PLAN_ACTIONS = Object.freeze([
  'hide_admin_modules',
  'freeze_admin_changes',
  'increase_audit',
  'reduce_surface',
  'dual_approval',
  'elevate_monitoring',
  'prepare_lockdown',
  'no_action'
]);

function planForProfile(profileId, risk) {
  const recs = [];
  const add = (action, reason, priority = 'MEDIUM') => {
    recs.push({ action, reason, priority });
  };

  switch (profileId) {
    case 'LOCKDOWN_READY':
      add('prepare_lockdown', 'Perfil LOCKDOWN_READY — preparar plano (não executar)', 'CRITICAL');
      add('dual_approval', 'Dupla aprovação obrigatória antes de qualquer acção futura', 'CRITICAL');
      add('hide_admin_modules', 'Ocultar módulos administrativos no plano operacional', 'HIGH');
      break;
    case 'HARDENED':
      add('dual_approval', 'Elevar para dupla aprovação humana', 'HIGH');
      add('elevate_monitoring', 'Monitorização SOC máxima', 'HIGH');
      add('reduce_surface', 'Reduzir superfície de ataque', 'HIGH');
      break;
    case 'PROTECTED':
      add('freeze_admin_changes', 'Congelar alterações administrativas (plano)', 'HIGH');
      add('hide_admin_modules', 'Ocultar módulos admin expostos', 'MEDIUM');
      add('increase_audit', 'Aumentar auditoria de runtime', 'MEDIUM');
      break;
    case 'ELEVATED':
      add('increase_audit', 'Reforçar auditoria operacional', 'MEDIUM');
      add('reduce_surface', 'Reduzir superfície recomendada', 'MEDIUM');
      add('elevate_monitoring', 'Elevar monitoramento', 'LOW');
      break;
    case 'OBSERVE':
      add('elevate_monitoring', 'Observação contínua reforçada', 'LOW');
      break;
    default:
      add('no_action', 'Perfil NORMAL — operação standard', 'INFO');
  }

  if (risk.exfiltrationConfidence >= 0.5 || risk.protectionUrgency >= 0.6) {
    add('increase_audit', 'Risco de exfiltração — auditoria reforçada', 'HIGH');
  }

  const seen = new Set();
  return recs.filter((r) => {
    if (seen.has(r.action)) return false;
    seen.add(r.action);
    return true;
  });
}

function createProtectionPlan(input) {
  const plan = {
    schema_version: 'runtime_protection_plan_v1',
    planId: `rpp-${Date.now()}`,
    action: input.action,
    planReason: input.reason,
    priority: input.priority || 'MEDIUM',
    targetProfile: input.targetProfile || 'NORMAL',
    auto_execute: false,
    executionEligible: false,
    approvalRequired: flags.requireApproval(),
    mode: flags.runtimeProtectionMode(),
    disclaimer: 'SEC-18 — plano operacional only, nenhuma execução automática',
    createdAt: new Date().toISOString()
  };

  store.addPlan(plan);
  metrics.increment('protection_plans');
  return plan;
}

function generateProtectionPlans(recommendedProfile, riskAssessment) {
  const risk = {
    protectionUrgency: riskAssessment.protectionUrgency,
    exfiltrationConfidence: riskAssessment.runtimeRiskScore
  };
  const actions = planForProfile(recommendedProfile, risk);
  return actions.map((a) => createProtectionPlan({
    action: a.action,
    reason: a.reason,
    priority: a.priority,
    targetProfile: recommendedProfile
  }));
}

module.exports = {
  PLAN_ACTIONS,
  planForProfile,
  createProtectionPlan,
  generateProtectionPlans
};
