'use strict';

/**
 * Contrato canónico do domínio SAFETY (SST/EHS) — WAVE enterprise.
 * Eventos alinhados ao industrialEventCatalog e publication runtime.
 */
module.exports = {
  CONTRACT_VERSION: 2,
  DOMAIN_ID: 'safety',
  ROUTE_PREFIX: '/app/safety',
  API_PREFIX: '/api/safety',
  MODULE_ID: 'safety_intelligence',
  EVENTS: Object.freeze([
    'safety.permit.issued',
    'safety.loto.applied',
    'safety.incident.reported',
    'safety.inspection.completed',
    'safety.risk.assessed',
    'safety.epi.assigned',
    'safety.apr.started',
    'safety.pt.issued',
    'safety.ghe.updated',
    'safety.ncr.opened',
    'safety.training.completed'
  ])
};
