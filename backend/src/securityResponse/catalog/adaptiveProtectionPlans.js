'use strict';

/**
 * SEC-06 — Protecção Adaptativa (planos apenas — nunca executar automaticamente).
 */

function buildAdaptiveProtectionPlan(context) {
  const { incident, threatProfile, integrityReport, notification } = context;

  const triggers = [];
  if (incident?.severity === 'CRITICAL') triggers.push('incident_critical');
  if (integrityReport?.integrityStatus === 'COMPROMISED') triggers.push('integrity_compromised');
  if (threatProfile?.riskLevel === 'Critical') triggers.push('threat_critical');

  return {
    schema_version: 'adaptive_protection_plan_v1',
    status: 'plan_only',
    auto_execute: false,
    approval_required: true,
    dual_operator_required: triggers.includes('integrity_compromised'),
    triggers,
    recommendations: [
      {
        id: 'protected_mode',
        action: 'Entrar em modo protegido',
        description: 'Reduzir superfície operacional até validação humana',
        executable: false,
        requires_approval: true
      },
      {
        id: 'limit_public_endpoints',
        action: 'Desabilitar exposição pública de endpoints administrativos',
        description: 'Restringir /api/admin/* a operadores autenticados via VPN',
        executable: false,
        requires_approval: true
      },
      {
        id: 'require_mfa_admin',
        action: 'Exigir MFA para operações administrativas',
        description: 'Reforço de autenticação para tenant_admin',
        executable: false,
        requires_approval: true
      },
      {
        id: 'freeze_admin_changes',
        action: 'Congelar alterações administrativas',
        description: 'Bloquear writes em config até fim da investigação',
        executable: false,
        requires_approval: true
      },
      {
        id: 'dual_operator_approval',
        action: 'Solicitar aprovação de dois operadores',
        description: 'Wellington + Gustavo para qualquer acção Protect',
        executable: false,
        requires_approval: true
      },
      {
        id: 'isolate_nonessential',
        action: 'Isolar módulos não essenciais',
        description: 'Lab PM2 (modbus, opcua) — recomendação, não execução automática',
        executable: false,
        requires_approval: true
      }
    ],
    context_summary: {
      incidentId: incident?.incidentId || notification?.incidentId || null,
      classification: incident?.classification || null,
      integrityStatus: integrityReport?.integrityStatus || null
    },
    disclaimer: 'Plano gerado pelo SEC-06 — nenhuma acção Protect executada automaticamente.'
  };
}

module.exports = { buildAdaptiveProtectionPlan };
