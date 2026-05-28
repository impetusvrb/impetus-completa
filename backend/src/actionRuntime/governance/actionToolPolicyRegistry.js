'use strict';

/**
 * Política por ferramenta — risco, HITL, rollback, explainability.
 */

const RISK = Object.freeze({ LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' });

const TOOL_POLICIES = Object.freeze({
  consultar_tarefas: {
    risk: RISK.LOW,
    require_approval: false,
    rollback_supported: false,
    category: 'read',
    explain_template: 'Consulta de tarefas operacionais (somente leitura).'
  },
  consultar_historico: {
    risk: RISK.LOW,
    require_approval: false,
    rollback_supported: false,
    category: 'read',
    explain_template: 'Consulta de histórico operacional (somente leitura).'
  },
  criar_tarefa: {
    risk: RISK.HIGH,
    require_approval: true,
    rollback_supported: true,
    category: 'write',
    explain_template: 'Criação de tarefa operacional com impacto em workflow.'
  },
  criar_lembrete: {
    risk: RISK.MEDIUM,
    require_approval: true,
    rollback_supported: true,
    category: 'write',
    explain_template: 'Agendamento de lembrete para utilizador.'
  },
  atualizar_status_tarefa: {
    risk: RISK.MEDIUM,
    require_approval: true,
    rollback_supported: true,
    category: 'write',
    explain_template: 'Alteração de estado de tarefa existente.'
  }
});

function getToolPolicy(toolName) {
  return TOOL_POLICIES[toolName] || {
    risk: RISK.HIGH,
    require_approval: true,
    rollback_supported: false,
    category: 'unknown',
    explain_template: 'Ferramenta não catalogada — aprovação humana obrigatória.'
  };
}

function requiresApproval(toolName, opts = {}) {
  const policy = getToolPolicy(toolName);
  if (opts.force_approval === true) return true;
  if (process.env.IMPETUS_ACTION_RUNTIME_REQUIRE_APPROVAL_ALL === 'true') return true;
  return !!policy.require_approval;
}

function listPolicies() {
  return Object.entries(TOOL_POLICIES).map(([name, p]) => ({ tool_name: name, ...p }));
}

module.exports = {
  RISK,
  getToolPolicy,
  requiresApproval,
  listPolicies,
  TOOL_POLICIES
};
