'use strict';

/**
 * WAVE 5 — registo declarativo de bounded contexts industriais.
 */

const DOMAINS = Object.freeze({
  quality: {
    id: 'quality',
    label: 'Qualidade',
    legacy_services: ['qualityIntelligenceService'],
    legacy_routes: ['/api/quality-intelligence'],
    event_prefix: 'quality.',
    scaffold_path: 'domains/quality',
    status: 'active',
    runtime_internal: '/api/internal/quality-universal'
  },
  safety: {
    id: 'safety',
    label: 'SST / EHS',
    legacy_services: [],
    legacy_routes: [
      '/api/safety-operational',
      '/api/safety-governance',
      '/api/safety-navigation',
      '/api/safety-activation'
    ],
    event_prefix: 'safety.',
    scaffold_path: 'domains/safety',
    status: 'active',
    runtime_internal: null
  },
  environment: {
    id: 'environment',
    label: 'Ambiental',
    legacy_services: ['environmentalCognitiveService'],
    legacy_routes: [
      '/api/environment-navigation',
      '/api/environment-activation',
      '/api/environment-operational',
      '/api/environment-governance',
      '/api/environment-operational-validation',
      '/api/environment-pilot-rollout'
    ],
    event_prefix: 'environment.',
    scaffold_path: 'domains/environment',
    status: 'shadow',
    runtime_internal: null
  },
  logistics: {
    id: 'logistics',
    label: 'Logística',
    legacy_services: ['logisticsIntelligenceService'],
    legacy_routes: [
      '/api/logistics-intelligence',
      '/api/logistics-navigation',
      '/api/logistics-activation',
      '/api/logistics-operational-validation'
    ],
    event_prefix: 'logistics.',
    scaffold_path: 'domains/logistics',
    status: 'shadow',
    runtime_internal: null
  },
  operational: {
    id: 'operational',
    label: 'Operacional (ponte)',
    legacy_services: [
      'operationalMemoryBindingService',
      'operationalAlertsService',
      'operationalInsightsService'
    ],
    legacy_routes: [],
    event_prefix: 'operational.',
    scaffold_path: 'domains/operational',
    status: 'bridge'
  }
});

function listDomains() {
  return Object.values(DOMAINS).map((d) => ({ ...d }));
}

function getDomain(id) {
  return DOMAINS[String(id || '').toLowerCase()] || null;
}

function mapLegacyServiceToDomain(serviceFileName) {
  const name = String(serviceFileName || '').replace(/\.js$/, '');
  for (const d of Object.values(DOMAINS)) {
    if ((d.legacy_services || []).includes(name)) return d.id;
  }
  return 'platform';
}

module.exports = {
  DOMAINS,
  listDomains,
  getDomain,
  mapLegacyServiceToDomain
};
