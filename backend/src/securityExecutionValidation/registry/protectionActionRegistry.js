'use strict';

/**
 * SEC-12 — Protection Action Registry.
 * Catálogo de acções possíveis — nenhuma executa directamente.
 */

const ACTIONS = Object.freeze([
  {
    id: 'restrict_admin',
    label: 'Restringir recursos administrativos',
    category: 'access',
    riskLevel: 'MEDIUM',
    rollbackDocumented: true,
    rollbackTested: false,
    rollbackAutomatic: false,
    estimatedDurationMinutes: 5,
    preconditions: ['SEC-11 approval', 'tenant_admin notified'],
    blockedInPhase: false,
    impactAreas: ['frontend', 'backend']
  },
  {
    id: 'limit_uploads',
    label: 'Limitar uploads',
    category: 'surface',
    riskLevel: 'MEDIUM',
    rollbackDocumented: true,
    rollbackTested: false,
    rollbackAutomatic: true,
    estimatedDurationMinutes: 3,
    preconditions: ['SEC-04 integrity OK or approved override'],
    blockedInPhase: false,
    impactAreas: ['backend', 'frontend']
  },
  {
    id: 'hide_documentation',
    label: 'Esconder documentação pública',
    category: 'surface',
    riskLevel: 'LOW',
    rollbackDocumented: true,
    rollbackTested: false,
    rollbackAutomatic: true,
    estimatedDurationMinutes: 2,
    preconditions: [],
    blockedInPhase: false,
    impactAreas: ['frontend', 'nginx']
  },
  {
    id: 'maintenance_mode',
    label: 'Activar maintenance mode lógico',
    category: 'availability',
    riskLevel: 'HIGH',
    rollbackDocumented: true,
    rollbackTested: false,
    rollbackAutomatic: true,
    estimatedDurationMinutes: 5,
    preconditions: ['dual approval', 'rollback plan validated'],
    blockedInPhase: false,
    impactAreas: ['frontend', 'backend']
  },
  {
    id: 'nginx_hardened_profile',
    label: 'Activar nginx hardened profile',
    category: 'infrastructure',
    riskLevel: 'CRITICAL',
    rollbackDocumented: true,
    rollbackTested: false,
    rollbackAutomatic: false,
    estimatedDurationMinutes: 15,
    preconditions: ['ops approval', 'nginx config backup'],
    blockedInPhase: true,
    blockReason: 'SEC-12 proíbe alteração nginx — validação only',
    impactAreas: ['nginx', 'frontend', 'backend']
  },
  {
    id: 'rate_limit_profile',
    label: 'Activar rate limit profile',
    category: 'surface',
    riskLevel: 'MEDIUM',
    rollbackDocumented: true,
    rollbackTested: false,
    rollbackAutomatic: true,
    estimatedDurationMinutes: 3,
    preconditions: ['SEC-02 correlation active recommended'],
    blockedInPhase: false,
    impactAreas: ['backend', 'express']
  },
  {
    id: 'emergency_login_policy',
    label: 'Activar emergency login policy',
    category: 'auth',
    riskLevel: 'HIGH',
    rollbackDocumented: true,
    rollbackTested: false,
    rollbackAutomatic: true,
    estimatedDurationMinutes: 5,
    preconditions: ['dual approval'],
    blockedInPhase: false,
    impactAreas: ['backend', 'frontend', 'auth']
  },
  {
    id: 'hide_admin_endpoints',
    label: 'Esconder endpoints administrativos',
    category: 'surface',
    riskLevel: 'MEDIUM',
    rollbackDocumented: true,
    rollbackTested: false,
    rollbackAutomatic: true,
    estimatedDurationMinutes: 3,
    preconditions: [],
    blockedInPhase: false,
    impactAreas: ['backend', 'frontend']
  },
  {
    id: 'block_known_fingerprint',
    label: 'Bloquear fingerprint conhecido',
    category: 'scanner',
    riskLevel: 'HIGH',
    rollbackDocumented: true,
    rollbackTested: false,
    rollbackAutomatic: true,
    estimatedDurationMinutes: 5,
    preconditions: ['SEC-10 pattern confirmed', 'dual approval'],
    blockedInPhase: true,
    blockReason: 'SEC-12 proíbe bloqueio IP/fingerprint automático — SEC-13',
    impactAreas: ['nginx', 'express']
  },
  {
    id: 'reduce_api_exposure',
    label: 'Reduzir exposição API',
    category: 'surface',
    riskLevel: 'MEDIUM',
    rollbackDocumented: true,
    rollbackTested: false,
    rollbackAutomatic: true,
    estimatedDurationMinutes: 4,
    preconditions: [],
    blockedInPhase: false,
    impactAreas: ['backend', 'frontend']
  }
]);

function getAllActions() {
  return ACTIONS.map((a) => ({ ...a }));
}

function getActionById(id) {
  return ACTIONS.find((a) => a.id === id) || null;
}

function mapPlanActionToRegistry(planAction) {
  const actionId = planAction.action || planAction.id;
  const aliases = {
    hide_admin_endpoints: 'hide_admin_endpoints',
    restrict_admin_features: 'restrict_admin',
    restrict_admin_apis: 'restrict_admin',
    limit_uploads: 'limit_uploads',
    restrict_public_documentation: 'hide_documentation',
    enable_rate_limiting: 'rate_limit_profile',
    increase_rate_limiting: 'rate_limit_profile',
    harden_nginx_headers: 'nginx_hardened_profile',
    block_known_fingerprint: 'block_known_fingerprint',
    reduce_api_exposure: 'reduce_api_exposure',
    limit_heavy_queries: 'rate_limit_profile'
  };
  const mapped = aliases[actionId] || actionId;
  return getActionById(mapped);
}

module.exports = { ACTIONS, getAllActions, getActionById, mapPlanActionToRegistry };
