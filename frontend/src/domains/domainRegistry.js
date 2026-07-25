/**
 * WAVE 6 — Registry modular frontend (espelha backend domains/_core/domainRegistry).
 * FIN-EVOLVE-001A — label Finance via metadata provider.
 */
import { FINANCE_DOMAIN_IDENTITY } from './finance/metadata/financeDomainMetadata.js';

export const DOMAIN_ROUTES = Object.freeze({
  quality: {
    id: 'quality',
    label: 'Qualidade',
    routePrefix: '/app/quality',
    lazyKey: 'domain-quality',
    operational: true,
    management: true,
    moduleKeys: ['quality_intelligence']
  },
  safety: {
    id: 'safety',
    label: 'SST / EHS',
    routePrefix: '/app/safety',
    lazyKey: 'domain-safety',
    operational: true,
    management: false,
    moduleKeys: []
  },
  environment: {
    id: 'environment',
    label: 'Ambiental',
    routePrefix: '/app/environment',
    lazyKey: 'domain-environment',
    operational: true,
    management: true,
    moduleKeys: ['environment_intelligence']
  },
  logistics: {
    id: 'logistics',
    label: 'Logística',
    routePrefix: '/app/logistics',
    lazyKey: 'domain-logistics',
    operational: true,
    management: true,
    moduleKeys: ['logistics_intelligence']
  },
  operational: {
    id: 'operational',
    label: 'Operacional',
    routePrefix: '/app/operacional',
    lazyKey: 'ops-core',
    operational: true,
    management: false,
    moduleKeys: ['operational', 'dashboard', 'cerebro_operacional']
  },
  finance: {
    id: 'finance',
    label: FINANCE_DOMAIN_IDENTITY.displayName,
    routePrefix: FINANCE_DOMAIN_IDENTITY.landingRoute,
    lazyKey: 'domain-finance',
    operational: true,
    management: true,
    moduleKeys: ['financial_intelligence', 'cost_center', 'losses_map']
  }
});

/** Map from visible_module key to domain. */
const MODULE_TO_DOMAIN = Object.entries(DOMAIN_ROUTES).reduce((acc, [, def]) => {
  for (const k of def.moduleKeys) {
    acc[k] = def.id;
  }
  return acc;
}, {});

export function getDomainForModuleKey(moduleKey) {
  return MODULE_TO_DOMAIN[String(moduleKey || '')] || null;
}

export function getDomain(id) {
  return DOMAIN_ROUTES[String(id || '')] || null;
}

export function listDomains() {
  return Object.values(DOMAIN_ROUTES);
}
