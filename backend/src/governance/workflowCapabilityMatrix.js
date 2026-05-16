'use strict';

/**
 * WAVE 7 — Workflow Capability Matrix.
 * Define que roles + capabilities são necessários para cada tipo de workflow.
 * Não substitui RBAC — é uma camada declarativa que pode ser consultada.
 * Por defeito: observe-only (IMPETUS_WORKFLOW_CAPABILITY_MATRIX_ENABLED).
 */

const { WORKFLOW_CAPABILITY_MATRIX_ENABLED } = require('./governanceFlags');

/**
 * @typedef {{
 *   workflowType: string,
 *   domain: string,
 *   requiredRoles: string[],
 *   requiredCapabilities: string[],
 *   allowAiInitiated: boolean,
 *   requiresHumanApproval: boolean,
 *   description: string
 * }} WorkflowCapabilityEntry
 */

/** @type {Map<string, WorkflowCapabilityEntry>} */
const _matrix = new Map();

const BUILT_IN_ENTRIES = [
  {
    workflowType: 'quality.inspection',
    domain: 'quality',
    requiredRoles: ['supervisor', 'gerente', 'coordenador', 'diretor', 'ceo'],
    requiredCapabilities: ['can_approve_inspection'],
    allowAiInitiated: false,
    requiresHumanApproval: true,
    description: 'Inspeção de qualidade industrial — requer aprovação humana.'
  },
  {
    workflowType: 'quality.non_conformance',
    domain: 'quality',
    requiredRoles: ['supervisor', 'gerente', 'coordenador', 'diretor', 'ceo'],
    requiredCapabilities: ['can_register_non_conformance'],
    allowAiInitiated: false,
    requiresHumanApproval: true,
    description: 'Registro de não-conformidade.'
  },
  {
    workflowType: 'safety.risk_assessment',
    domain: 'safety',
    requiredRoles: ['supervisor', 'gerente', 'diretor', 'ceo'],
    requiredCapabilities: ['can_assess_risk'],
    allowAiInitiated: false,
    requiresHumanApproval: true,
    description: 'Avaliação de risco SST — alto impacto, sempre humano.'
  },
  {
    workflowType: 'safety.incident_report',
    domain: 'safety',
    requiredRoles: ['colaborador', 'operador', 'supervisor', 'gerente', 'diretor', 'ceo', 'auxiliar_producao', 'auxiliar'],
    requiredCapabilities: ['can_report_incident'],
    allowAiInitiated: false,
    requiresHumanApproval: false,
    description: 'Registo de incidente — qualquer colaborador pode reportar.'
  },
  {
    workflowType: 'logistics.dispatch',
    domain: 'logistics',
    requiredRoles: ['operador', 'supervisor', 'gerente', 'coordenador', 'diretor', 'ceo'],
    requiredCapabilities: ['can_dispatch_shipment'],
    allowAiInitiated: false,
    requiresHumanApproval: true,
    description: 'Despacho logístico — requer aprovação humana.'
  },
  {
    workflowType: 'logistics.stock_adjustment',
    domain: 'logistics',
    requiredRoles: ['supervisor', 'gerente', 'coordenador', 'diretor', 'ceo'],
    requiredCapabilities: ['can_adjust_stock'],
    allowAiInitiated: false,
    requiresHumanApproval: true,
    description: 'Ajuste de stock.'
  },
  {
    workflowType: 'operational.alert_acknowledge',
    domain: 'operational',
    requiredRoles: ['colaborador', 'operador', 'supervisor', 'gerente', 'coordenador', 'diretor', 'ceo', 'auxiliar_producao', 'auxiliar'],
    requiredCapabilities: ['can_acknowledge_alert'],
    allowAiInitiated: true,
    requiresHumanApproval: false,
    description: 'Reconhecimento de alerta operacional — IA pode sugerir, humano confirma.'
  },
  {
    workflowType: 'operational.maintenance_order',
    domain: 'operational',
    requiredRoles: ['supervisor', 'gerente', 'coordenador', 'diretor', 'ceo'],
    requiredCapabilities: ['can_create_maintenance_order'],
    allowAiInitiated: false,
    requiresHumanApproval: true,
    description: 'Ordem de manutenção — requer aprovação humana.'
  },
  {
    workflowType: 'environment.emission_report',
    domain: 'environment',
    requiredRoles: ['supervisor', 'gerente', 'diretor', 'ceo'],
    requiredCapabilities: ['can_submit_emission_report'],
    allowAiInitiated: false,
    requiresHumanApproval: true,
    description: 'Relatório de emissão ambiental — regulado, sempre humano.'
  }
];

// Seed built-in entries
for (const entry of BUILT_IN_ENTRIES) {
  _matrix.set(entry.workflowType, Object.freeze({ ...entry }));
}

/**
 * Regista uma entrada na capability matrix.
 * @param {WorkflowCapabilityEntry} entry
 */
function registerWorkflowCapability(entry) {
  if (!entry || !entry.workflowType) throw new Error('workflowType required');
  _matrix.set(entry.workflowType, Object.freeze({ ...entry }));
}

/**
 * Retorna a entrada da matrix para um tipo de workflow.
 * @param {string} workflowType
 * @returns {WorkflowCapabilityEntry | null}
 */
function getWorkflowCapability(workflowType) {
  return _matrix.get(String(workflowType || '')) || null;
}

/**
 * Verifica se um role tem permissão para iniciar um workflow.
 * Retorna { allowed, reason, entry }.
 * Modo observe: não bloqueia, apenas informa.
 *
 * Se `context.capabilities` não for fornecido, deriva implicitamente as
 * capabilities do role via domainCapabilityGovernance (evita falso-negativo
 * quando o caller não passa o array explícito).
 *
 * @param {string} workflowType
 * @param {string} role
 * @param {{ capabilities?: string[] }} [context]
 */
function checkWorkflowCapability(workflowType, role, context = {}) {
  if (!WORKFLOW_CAPABILITY_MATRIX_ENABLED) {
    return { allowed: true, mode: 'disabled', reason: 'capability_matrix_disabled' };
  }
  const entry = getWorkflowCapability(workflowType);
  if (!entry) {
    return { allowed: true, mode: 'unknown', reason: 'workflow_type_not_registered' };
  }
  const normalizedRole = String(role || '').toLowerCase();
  const roleAllowed = entry.requiredRoles.includes(normalizedRole);

  // Deriva capabilities do role se não fornecidas explicitamente.
  let userCaps;
  if (Array.isArray(context.capabilities)) {
    userCaps = context.capabilities;
  } else {
    try {
      const dcg = require('./domainCapabilityGovernance');
      userCaps = dcg.getCapabilitiesForRole(normalizedRole).map((c) => c.capability_id);
    } catch {
      userCaps = [];
    }
  }

  const capsAllowed =
    entry.requiredCapabilities.length === 0 ||
    entry.requiredCapabilities.some((c) => userCaps.includes(c));

  const allowed = roleAllowed && capsAllowed;
  return {
    allowed,
    mode: 'observe',
    reason: allowed
      ? 'role_and_capability_match'
      : !roleAllowed
        ? 'role_not_allowed'
        : 'capability_missing',
    entry: { workflowType: entry.workflowType, domain: entry.domain, requiresHumanApproval: entry.requiresHumanApproval }
  };
}

/**
 * Lista todos os workflows registados.
 * @returns {WorkflowCapabilityEntry[]}
 */
function listWorkflowCapabilities() {
  return Array.from(_matrix.values());
}

/**
 * Retorna a matrix resumida para um domínio específico.
 * @param {string} domain
 */
function getCapabilitiesForDomain(domain) {
  const d = String(domain || '').toLowerCase();
  return Array.from(_matrix.values()).filter((e) => e.domain === d);
}

module.exports = {
  registerWorkflowCapability,
  getWorkflowCapability,
  checkWorkflowCapability,
  listWorkflowCapabilities,
  getCapabilitiesForDomain
};
