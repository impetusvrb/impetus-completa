/**
 * ENT-001 — Catálogo corporativo de domínios (consolidação EOX + domainRegistry + auditorias).
 */
import { EOX_DOMAIN_REGISTRY, OPERATIONAL_DOMAIN_REGISTRY } from '../../presentation/eox/eoxRegistry.js';
import { DOMAIN_ROUTES } from '../../domains/domainRegistry.js';
import { FINANCE_DOMAIN_STATUS } from '../audit/finance/finAud001DiscoveryIndex.js';
import { WMS_ENTERPRISE_BASELINE } from '../cognitive/registry/cognitivePlatformRegistry.js';
import { ENT_001_PHASE } from './ent001Constants.js';

/** Domínios de plataforma não declarados em EOX mas evidenciados em CPL/ARC */
const PLATFORM_EXTENSION_DOMAINS = Object.freeze([
  Object.freeze({
    id: 'command_center',
    label: 'Centro de Comando',
    active: true,
    basePath: '/app/centro-comando',
    maturity: 'mature',
    certification: 'ARC / UX',
    runtime: 'dashboard_profiles',
    source: 'features/dashboard/centroComando/'
  }),
  Object.freeze({
    id: 'cognitive_center',
    label: 'Centro Cognitivo',
    active: true,
    basePath: '/app/centro-cognitivo',
    maturity: 'mature',
    certification: 'CPL / cognitiveRuntime',
    runtime: 'cognitiveRuntime',
    source: 'cognitiveRuntime/ + presentation/'
  }),
  Object.freeze({
    id: 'nexus_ia',
    label: 'Nexus IA',
    active: true,
    basePath: '/app/admin/nexusia-custos',
    maturity: 'mature',
    certification: 'FIN-AUD-001',
    runtime: 'nexus_billing_engine_v4',
    source: 'backend/src/services/nexusBillingEngine/'
  }),
  Object.freeze({
    id: 'executive',
    label: 'Executivo / AIOI',
    active: true,
    basePath: '/app/executivo',
    maturity: 'partial',
    certification: 'ARC',
    runtime: 'executive_aioi',
    source: 'features/dashboard/ + cognitiveRuntime/economics/'
  }),
  Object.freeze({
    id: 'maintenance',
    label: 'Manutenção',
    active: false,
    basePath: null,
    maturity: 'not_started',
    certification: null,
    runtime: null,
    source: 'Referências em roleUtils / dashboardSurfaceCapabilities — domínio não implementado'
  }),
  Object.freeze({
    id: 'hr',
    label: 'Recursos Humanos',
    active: false,
    basePath: null,
    maturity: 'not_started',
    certification: null,
    runtime: null,
    source: 'Não encontrado em EOX ou domainRegistry'
  }),
  Object.freeze({
    id: 'purchasing',
    label: 'Compras',
    active: false,
    basePath: null,
    maturity: 'discovered',
    certification: null,
    runtime: 'supply',
    source: 'domains/supply/ — consumidor parcial, não domínio EOX activo'
  }),
  Object.freeze({
    id: 'audit',
    label: 'Auditoria',
    active: true,
    basePath: '/app/auditoria',
    maturity: 'partial',
    certification: 'FIN-AUD / REG',
    runtime: 'audit_services',
    source: 'backend/src/services/audit/ + platform/audit/'
  }),
  Object.freeze({
    id: 'compliance',
    label: 'Compliance',
    active: true,
    basePath: null,
    maturity: 'partial',
    certification: 'GF-027',
    runtime: 'cross_domain',
    source: 'quality/safety/environment compliance views'
  })
]);

function _mapEoxDomain(id, entry) {
  let maturity = entry.active ? 'mature' : 'not_started';
  let certification = null;
  let runtime = null;

  if (id === 'logistics_wms') {
    maturity = WMS_ENTERPRISE_BASELINE.frozen ? 'certified' : 'mature';
    certification = WMS_ENTERPRISE_BASELINE.phases.join(', ');
    runtime = 'WMS Enterprise Baseline';
  } else if (id === 'finance') {
    maturity = FINANCE_DOMAIN_STATUS.maturity === 'placeholder' ? 'discovered' : FINANCE_DOMAIN_STATUS.maturity;
    runtime = FINANCE_DOMAIN_STATUS.financeNativeRuntime;
  } else if (['quality', 'safety', 'environment'].includes(id)) {
    maturity = 'mature';
    certification = entry.defaultPhase || 'GF-027';
    runtime = `${id}_operational_runtime`;
  } else if (id === 'production' || id === 'supply') {
    maturity = id === 'supply' ? 'partial' : 'not_started';
  }

  return Object.freeze({
    domainId: id,
    label: entry.label,
    active: entry.active === true,
    basePath: entry.basePath,
    landingPath: entry.domainLandingPath || entry.basePath,
    version: entry.version,
    phase: entry.defaultPhase,
    maturity,
    certification,
    runtime,
    eox: true,
    source: 'frontend/src/presentation/eox/eoxRegistry.js'
  });
}

function _mapOperationalExtra(id, entry) {
  return Object.freeze({
    domainId: id,
    label: entry.label,
    active: entry.active === true,
    basePath: entry.basePath,
    landingPath: entry.domainLandingPath || entry.basePath,
    version: entry.version,
    phase: entry.defaultPhase,
    maturity: entry.active ? 'discovered' : 'not_started',
    certification: null,
    runtime: `${id}_cockpit_runtime`,
    eox: true,
    source: 'EOX OPERATIONAL_DOMAIN_REGISTRY — cockpit nativo CC'
  });
}

function _mapDomainRoutes(id, def) {
  return Object.freeze({
    domainId: id,
    label: def.label,
    active: def.operational === true,
    basePath: def.routePrefix,
    landingPath: def.routePrefix,
    version: null,
    phase: 'WAVE-6',
    maturity: def.operational ? 'mature' : 'partial',
    certification: 'domainRegistry.js',
    runtime: def.lazyKey,
    eox: false,
    moduleKeys: Object.freeze([...(def.moduleKeys || [])]),
    source: 'frontend/src/domains/domainRegistry.js'
  });
}

/** Catálogo único — deduplica logistics_wms vs logistics vs logistics_hub */
export function buildEnterpriseDomainCatalog() {
  const byId = new Map();

  for (const [id, entry] of Object.entries(EOX_DOMAIN_REGISTRY)) {
    if (id === 'logistics_hub') continue;
    byId.set(id, _mapEoxDomain(id, entry));
  }

  for (const [id, entry] of Object.entries(OPERATIONAL_DOMAIN_REGISTRY)) {
    if (EOX_DOMAIN_REGISTRY[id]) continue;
    byId.set(id, _mapOperationalExtra(id, entry));
  }

  for (const [id, def] of Object.entries(DOMAIN_ROUTES)) {
    if (!byId.has(id) && id !== 'logistics') {
      byId.set(id, _mapDomainRoutes(id, def));
    }
  }

  for (const ext of PLATFORM_EXTENSION_DOMAINS) {
    if (!byId.has(ext.id)) {
      byId.set(
        ext.id,
        Object.freeze({
          domainId: ext.id,
          label: ext.label,
          active: ext.active,
          basePath: ext.basePath,
          landingPath: ext.basePath,
          version: null,
          phase: null,
          maturity: ext.maturity,
          certification: ext.certification,
          runtime: ext.runtime,
          eox: false,
          source: ext.source
        })
      );
    }
  }

  return Object.freeze([...byId.values()].sort((a, b) => a.domainId.localeCompare(b.domainId)));
}

export const ENT_DOMAIN_CATALOG = buildEnterpriseDomainCatalog();

export function getDomainEntry(domainId) {
  return ENT_DOMAIN_CATALOG.find((d) => d.domainId === domainId) ?? null;
}

export function listDomainsByMaturity(maturity) {
  return ENT_DOMAIN_CATALOG.filter((d) => d.maturity === maturity);
}

export function validateDomainCatalog() {
  const issues = [];
  const ids = new Set();
  for (const d of ENT_DOMAIN_CATALOG) {
    if (ids.has(d.domainId)) issues.push(`duplicate domain: ${d.domainId}`);
    ids.add(d.domainId);
    if (!d.label) issues.push(`${d.domainId}: missing label`);
  }
  const required = ['logistics_wms', 'quality', 'safety', 'environment', 'finance', 'command_center'];
  for (const id of required) {
    if (!getDomainEntry(id)) issues.push(`missing required domain: ${id}`);
  }
  return {
    valid: issues.length === 0,
    issues,
    phase: ENT_001_PHASE,
    count: ENT_DOMAIN_CATALOG.length
  };
}
