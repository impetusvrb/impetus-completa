'use strict';

/**
 * Industrial Safety & Environment Promotion Gate v1
 *
 * Verifica AUTOMATICAMENTE todos os pré-requisitos para que Safety (Z.25)
 * ou Environment (P1) possam sair de SHADOW para FULL ON.
 *
 * Resultado binário:
 *   ❌ BLOCKED — permanece em shadow, lista gaps
 *   ✅ AUTHORIZED — elegível para ON
 *
 * Nenhuma promoção silenciosa é permitida.
 * Este gate é chamado antes de qualquer alteração de ACTIVATION_STAGE.
 */

const policyEvaluator = require('./domainPolicyEvaluator');

function _envBool(name) {
  return String(process.env[name] || '').toLowerCase() === 'true';
}

function _envVal(name, def = 'off') {
  return String(process.env[name] || def).toLowerCase();
}

/**
 * @param {'safety'|'environment'} domain
 * @param {{ company_id?: string, has_approved_publication?: boolean, has_real_data?: boolean, responsible_engineers_defined?: boolean }} ctx
 * @returns {{ authorized: boolean, domain: string, gate_version: string, checks: object[], blockers: string[], timestamp: string }}
 */
function evaluateGate(domain, ctx = {}) {
  const checks = [];
  const blockers = [];

  // 1. Policy Engine ativo e versionado
  const engineHealth = policyEvaluator.getEngineHealth();
  const policyActive = engineHealth.active && engineHealth.mode === 'on';
  checks.push({
    id: 'policy_engine_active',
    label: 'Policy Engine versionado e ativo',
    passed: policyActive,
    detail: engineHealth
  });
  if (!policyActive) blockers.push('Policy Engine não está em modo ON (IMPETUS_DOMAIN_POLICY_ENGINE != on)');

  // 2. Policies carregadas para o domínio
  const policyCount = domain === 'safety' ? engineHealth.safety_policies_count : engineHealth.environment_policies_count;
  const hasPolicies = policyCount >= 1;
  checks.push({
    id: 'policies_loaded',
    label: `Policies versionadas carregadas para ${domain}`,
    passed: hasPolicies,
    detail: { count: policyCount }
  });
  if (!hasPolicies) blockers.push(`Nenhuma policy carregada para domínio ${domain}`);

  // 3. Industrial Audit habilitado
  const auditEnabled = _envBool('IMPETUS_INDUSTRIAL_AUDIT_ENABLED');
  checks.push({
    id: 'audit_immutable',
    label: 'Industrial Audit imutável habilitado',
    passed: auditEnabled,
    detail: { flag: 'IMPETUS_INDUSTRIAL_AUDIT_ENABLED', value: auditEnabled }
  });
  if (!auditEnabled) blockers.push('Audit trail imutável desligado (IMPETUS_INDUSTRIAL_AUDIT_ENABLED != true)');

  // 4. Cognitive runtime permanece SHADOW (sem autonomia)
  const cogRuntimeFlag = domain === 'safety'
    ? 'IMPETUS_SAFETY_COGNITIVE_RUNTIME'
    : 'IMPETUS_ENVIRONMENTAL_COGNITIVE_RUNTIME';
  const cogRuntime = _envVal(cogRuntimeFlag, 'off');
  const cogShadow = cogRuntime === 'shadow' || cogRuntime === 'off';
  checks.push({
    id: 'cognitive_shadow',
    label: 'Cognitive runtime permanece SHADOW (sem autonomia IA)',
    passed: cogShadow,
    detail: { flag: cogRuntimeFlag, value: cogRuntime }
  });
  if (!cogShadow) blockers.push(`Cognitive runtime não está em shadow/off (valor: ${cogRuntime})`);

  // 5. RBAC publication roles configurados
  const approvalSvc = require('./domainPublicationApprovalService');
  const rolesDefined = approvalSvc.PUBLICATION_ROLES[domain]?.approvers?.length > 0;
  checks.push({
    id: 'rbac_roles_defined',
    label: 'RBAC publication roles (approver/operator/viewer) definidos',
    passed: rolesDefined,
    detail: { roles: approvalSvc.PUBLICATION_ROLES[domain] }
  });
  if (!rolesDefined) blockers.push('RBAC publication roles não definidos');

  // 6. Responsible engineers definidos (contexto runtime)
  const hasEngineers = ctx.responsible_engineers_defined !== false;
  checks.push({
    id: 'responsible_engineers',
    label: 'Engenheiros responsáveis definidos no tenant',
    passed: hasEngineers,
    detail: { provided: ctx.responsible_engineers_defined }
  });
  if (!hasEngineers) blockers.push('Engenheiros responsáveis não definidos para o tenant');

  // 7. Pelo menos uma aprovação humana concluída (evidência de HITL funcional)
  const hasApprovedPub = ctx.has_approved_publication === true;
  checks.push({
    id: 'hitl_evidence',
    label: 'Pelo menos 1 aprovação humana executada com sucesso',
    passed: hasApprovedPub,
    detail: { has_approved_publication: hasApprovedPub }
  });
  if (!hasApprovedPub) blockers.push('Nenhuma aprovação humana concluída — HITL não exercitado');

  // 8. Global cognitive runtime permanece OFF
  const globalCognitive = _envVal('IMPETUS_COGNITIVE_RUNTIME', 'off');
  const globalOff = globalCognitive === 'off';
  checks.push({
    id: 'global_cognitive_off',
    label: 'IMPETUS_COGNITIVE_RUNTIME global permanece OFF',
    passed: globalOff,
    detail: { value: globalCognitive }
  });
  if (!globalOff) blockers.push('IMPETUS_COGNITIVE_RUNTIME global não está OFF');

  // 9. Publication shadow PODE ser desligado (indica elegibilidade)
  const pubShadowFlag = domain === 'safety'
    ? 'IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE'
    : 'IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE';
  const currentPubShadow = _envBool(pubShadowFlag);
  checks.push({
    id: 'publication_shadow_status',
    label: `Status actual de PUBLICATION_SHADOW_MODE`,
    passed: true,
    detail: { flag: pubShadowFlag, value: currentPubShadow, note: 'informativo — não bloqueante' }
  });

  const authorized = blockers.length === 0;

  return {
    authorized,
    domain,
    gate_version: '1.0.0',
    gate_name: 'Industrial Safety & Environment Promotion Gate v1',
    checks,
    blockers,
    total_checks: checks.length,
    passed_checks: checks.filter(c => c.passed).length,
    timestamp: new Date().toISOString()
  };
}

module.exports = { evaluateGate };
