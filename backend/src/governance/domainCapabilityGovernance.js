'use strict';

/**
 * WAVE 7 — Domain Capability Governance.
 * Registo declarativo de capabilities por domínio industrial.
 * Complementa o ABAC extension sem substituir RBAC.
 * Flag: IMPETUS_DOMAIN_CAPABILITY_GOVERNANCE_ENABLED (default false).
 */

const { DOMAIN_CAPABILITY_GOVERNANCE_ENABLED } = require('./governanceFlags');

/**
 * @typedef {{
 *   capability_id: string,
 *   domain: string,
 *   label: string,
 *   description: string,
 *   roles_that_possess: string[],
 *   requires_human_actor: boolean
 * }} DomainCapability
 */

/** @type {Map<string, DomainCapability>} capability_id → DomainCapability */
const _capabilities = new Map();

const BUILT_IN = [
  // Quality domain
  { capability_id: 'can_approve_inspection', domain: 'quality', label: 'Aprovar inspeção', description: 'Permite aprovar ou reprovar uma inspeção de qualidade.', roles_that_possess: ['supervisor', 'gerente', 'coordenador', 'diretor', 'ceo'], requires_human_actor: true },
  { capability_id: 'can_register_non_conformance', domain: 'quality', label: 'Registar não-conformidade', description: 'Permite criar registros de não-conformidade.', roles_that_possess: ['supervisor', 'gerente', 'coordenador', 'diretor', 'ceo', 'operador'], requires_human_actor: true },
  { capability_id: 'can_export_quality_reports', domain: 'quality', label: 'Exportar relatórios de qualidade', description: 'Exportação de relatórios de qualidade para reguladores.', roles_that_possess: ['gerente', 'diretor', 'ceo'], requires_human_actor: true },
  // Safety domain
  { capability_id: 'can_assess_risk', domain: 'safety', label: 'Avaliar risco SST', description: 'Avaliação formal de riscos de segurança.', roles_that_possess: ['supervisor', 'gerente', 'diretor', 'ceo'], requires_human_actor: true },
  { capability_id: 'can_report_incident', domain: 'safety', label: 'Reportar incidente', description: 'Qualquer colaborador pode reportar.', roles_that_possess: ['colaborador', 'operador', 'supervisor', 'gerente', 'coordenador', 'diretor', 'ceo', 'auxiliar_producao', 'auxiliar'], requires_human_actor: true },
  { capability_id: 'can_close_incident', domain: 'safety', label: 'Encerrar incidente', description: 'Encerramento formal de incidente SST.', roles_that_possess: ['supervisor', 'gerente', 'diretor', 'ceo'], requires_human_actor: true },
  // Logistics domain
  { capability_id: 'can_dispatch_shipment', domain: 'logistics', label: 'Despachar expedição', description: 'Autorização de despacho logístico.', roles_that_possess: ['operador', 'supervisor', 'gerente', 'coordenador', 'diretor', 'ceo'], requires_human_actor: true },
  { capability_id: 'can_adjust_stock', domain: 'logistics', label: 'Ajustar stock', description: 'Ajuste manual de inventário.', roles_that_possess: ['supervisor', 'gerente', 'coordenador', 'diretor', 'ceo'], requires_human_actor: true },
  // Operational domain
  { capability_id: 'can_acknowledge_alert', domain: 'operational', label: 'Reconhecer alerta', description: 'Reconhecimento de alerta operacional.', roles_that_possess: ['colaborador', 'operador', 'supervisor', 'gerente', 'coordenador', 'diretor', 'ceo', 'auxiliar_producao', 'auxiliar'], requires_human_actor: false },
  { capability_id: 'can_create_maintenance_order', domain: 'operational', label: 'Criar OS de manutenção', description: 'Criação de ordem de serviço de manutenção.', roles_that_possess: ['supervisor', 'gerente', 'coordenador', 'diretor', 'ceo'], requires_human_actor: true },
  // Environment domain
  { capability_id: 'can_submit_emission_report', domain: 'environment', label: 'Submeter relatório de emissão', description: 'Submissão de relatório ambiental para órgão regulador.', roles_that_possess: ['gerente', 'diretor', 'ceo'], requires_human_actor: true },
  // Cross-domain
  { capability_id: 'cross_domain_access', domain: '_global', label: 'Acesso cross-domain', description: 'Capacidade especial para actuar em qualquer domínio.', roles_that_possess: ['admin', 'internal_admin', 'ceo'], requires_human_actor: false }
];

for (const cap of BUILT_IN) {
  _capabilities.set(cap.capability_id, Object.freeze({ ...cap }));
}

/**
 * Regista uma capability de domínio.
 * @param {DomainCapability} cap
 */
function registerDomainCapability(cap) {
  if (!cap || !cap.capability_id || !cap.domain) throw new Error('capability_id and domain required');
  _capabilities.set(cap.capability_id, Object.freeze({ ...cap }));
}

/**
 * Retorna uma capability pelo ID.
 * @param {string} capabilityId
 */
function getDomainCapability(capabilityId) {
  return _capabilities.get(String(capabilityId || '')) || null;
}

/**
 * Lista capabilities de um domínio.
 * @param {string} domain
 */
function listCapabilitiesForDomain(domain) {
  const d = String(domain || '').toLowerCase();
  return Array.from(_capabilities.values()).filter((c) => c.domain === d || c.domain === '_global');
}

/**
 * Verifica se um role possui uma capability específica.
 * Retorna { granted, mode, reason }
 * @param {string} capabilityId
 * @param {string} role
 */
function checkCapability(capabilityId, role) {
  if (!DOMAIN_CAPABILITY_GOVERNANCE_ENABLED) {
    return { granted: true, mode: 'disabled', reason: 'governance_disabled' };
  }
  const cap = getDomainCapability(capabilityId);
  if (!cap) {
    return { granted: true, mode: 'unknown', reason: 'capability_not_registered' };
  }
  const norm = String(role || '').toLowerCase();
  const granted = cap.roles_that_possess.includes(norm);
  return {
    granted,
    mode: 'observe',
    reason: granted ? 'role_possesses_capability' : 'role_lacks_capability',
    capability_id: cap.capability_id,
    domain: cap.domain
  };
}

/**
 * Retorna todas as capabilities que um role possui.
 * @param {string} role
 */
function getCapabilitiesForRole(role) {
  const norm = String(role || '').toLowerCase();
  return Array.from(_capabilities.values()).filter((c) => c.roles_that_possess.includes(norm));
}

/**
 * Estatísticas do registry de capabilities.
 */
function getDomainCapabilityStats() {
  const byDomain = {};
  for (const cap of _capabilities.values()) {
    byDomain[cap.domain] = (byDomain[cap.domain] || 0) + 1;
  }
  return {
    enabled: DOMAIN_CAPABILITY_GOVERNANCE_ENABLED,
    total_capabilities: _capabilities.size,
    by_domain: byDomain
  };
}

module.exports = {
  registerDomainCapability,
  getDomainCapability,
  listCapabilitiesForDomain,
  checkCapability,
  getCapabilitiesForRole,
  getDomainCapabilityStats
};
