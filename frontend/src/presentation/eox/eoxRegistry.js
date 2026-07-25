/**
 * ARC-003 — Registo corporativo EOX (todos os domínios operacionais).
 */
import { EOX_PHASE, COGNITIVE_CENTER_RETURN, IMPETUS_ROOT } from './eoxTokens.js';
import {
  WMS_LOGISTICS_BASE,
  getWmsModuleBySegment
} from '../../domains/logistics-operational/routes/wmsModuleRegistry.js';
import { FINANCE_EOX_DOMAIN_ENTRY } from '../../domains/finance/metadata/financeDomainMetadata.js';

export const LOGISTICS_MODULE_PHASES = Object.freeze({
  warehouses: 'OPM-001C',
  inventory: 'OPM-002A',
  receiving: 'OPM-003',
  picking: 'OPM-004',
  shipping: 'OPM-005',
  transfers: 'OPM-006',
  warehouse_intelligence: 'OPM-007',
  cognitive_logistics: 'OPM-008'
});

const CC = COGNITIVE_CENTER_RETURN;

function domainBack(label, landingPath) {
  return Object.freeze({
    path: landingPath,
    label: `Voltar para ${label}`,
    shortLabel: label
  });
}

/** Domínios activos + consumidores futuros (Supply, Finance). */
export const EOX_DOMAIN_REGISTRY = Object.freeze({
  logistics_wms: Object.freeze({
    id: 'logistics_wms',
    label: 'Logística',
    active: true,
    basePath: WMS_LOGISTICS_BASE,
    domainLandingPath: '/app/logistics/operational',
    backTarget: domainBack('Logística', '/app/logistics/operational'),
    ccBackTarget: CC,
    version: 'WMS-003 v1',
    defaultPhase: 'WMS-007A',
    hubSubtitle: 'Gestão operacional logística · WMS standalone · OTIF · Recebimento · Expedição'
  }),
  logistics_hub: Object.freeze({
    id: 'logistics_hub',
    label: 'Logística',
    active: true,
    basePath: '/app/logistics/operational',
    domainLandingPath: '/app/logistics/operational',
    backTarget: domainBack('Logística', '/app/logistics/operational'),
    ccBackTarget: CC,
    version: 'Logística v1',
    defaultPhase: 'GF-027',
    hubSubtitle: 'OTIF · Recebimento · Expedição · Governança · Telemetria'
  }),
  quality: Object.freeze({
    id: 'quality',
    label: 'Qualidade',
    active: true,
    basePath: '/app/quality/operational',
    domainLandingPath: '/app/quality/operational',
    backTarget: domainBack('Qualidade', '/app/quality/operational'),
    ccBackTarget: CC,
    version: 'Qualidade v1',
    defaultPhase: 'GF-027',
    hubSubtitle: 'Inspeções · NCR/CAPA · SPC · Telemetria · Inteligência contextual · Rollout'
  }),
  safety: Object.freeze({
    id: 'safety',
    label: 'Segurança',
    active: true,
    basePath: '/app/safety/operational',
    domainLandingPath: '/app/safety/operational',
    backTarget: domainBack('Segurança', '/app/safety/operational'),
    ccBackTarget: CC,
    version: 'SST v1',
    defaultPhase: 'GF-027',
    hubSubtitle: 'GHE · Matriz de risco · PT/APR/LOTO · EPI/EPC · Incidentes · Compliance'
  }),
  environment: Object.freeze({
    id: 'environment',
    label: 'Meio Ambiente',
    active: true,
    basePath: '/app/environment/operational',
    domainLandingPath: '/app/environment/operational',
    backTarget: domainBack('Meio Ambiente', '/app/environment/operational'),
    ccBackTarget: CC,
    version: 'Ambiental v1',
    defaultPhase: 'GF-027',
    hubSubtitle: 'Água · Efluentes · Emissões · Resíduos · ESG · Compliance ambiental'
  }),
  production: Object.freeze({
    id: 'production',
    label: 'Produção',
    active: false,
    basePath: '/app/production/operational',
    domainLandingPath: '/app/production/operational',
    backTarget: domainBack('Produção', '/app/production/operational'),
    ccBackTarget: CC,
    version: '—',
    defaultPhase: 'PLANNED',
    hubSubtitle: 'Módulo operacional de produção (consumidor futuro EOX)'
  }),
  supply: Object.freeze({
    id: 'supply',
    label: 'Supply',
    active: false,
    basePath: '/app/supply',
    domainLandingPath: '/app/supply/workspace',
    backTarget: domainBack('Supply', '/app/supply/workspace'),
    ccBackTarget: CC,
    version: 'Supply v1',
    defaultPhase: 'GF-027',
    hubSubtitle: 'Consumidor futuro EOX — OPM-008'
  }),
  finance: FINANCE_EOX_DOMAIN_ENTRY
});

/** Compat NAV-002 — alias do registo EOX */
export const OPERATIONAL_DOMAIN_REGISTRY = Object.freeze({
  ...EOX_DOMAIN_REGISTRY,
  ppap: Object.freeze({
    id: 'ppap',
    label: 'PPAP',
    active: false,
    basePath: '/app/quality/ppap',
    domainLandingPath: '/app/quality/operational',
    backTarget: domainBack('Qualidade', '/app/quality/operational'),
    ccBackTarget: CC,
    version: '—',
    defaultPhase: 'PLANNED'
  }),
  msa: Object.freeze({
    id: 'msa',
    label: 'MSA',
    active: false,
    basePath: '/app/quality/msa',
    domainLandingPath: '/app/quality/operational',
    backTarget: domainBack('Qualidade', '/app/quality/operational'),
    ccBackTarget: CC,
    version: '—',
    defaultPhase: 'PLANNED'
  }),
  ishikawa: Object.freeze({
    id: 'ishikawa',
    label: 'Ishikawa',
    active: false,
    basePath: '/app/quality/ishikawa',
    domainLandingPath: '/app/quality/operational',
    backTarget: domainBack('Qualidade', '/app/quality/operational'),
    ccBackTarget: CC,
    version: '—',
    defaultPhase: 'PLANNED'
  })
});

const QUALITY_VIEWS = Object.freeze({
  governance: { label: 'NCR & CAPA', subtitle: 'Governança · SPC · CAPA' },
  telemetry: { label: 'Telemetria', subtitle: 'Telemetria operacional de qualidade' },
  cognitive: { label: 'Inteligência contextual', subtitle: 'Painéis cognitivos de qualidade' },
  rollout: { label: 'Rollout', subtitle: 'Rollout e maturidade operacional' },
  diagnostics: { label: 'Diagnósticos', subtitle: 'Diagnósticos (pilot)' }
});

const QUALITY_ROUTES = Object.freeze({
  inspection: { label: 'Inspeções', subtitle: 'Runtime de inspeção de qualidade' },
  kiosk: { label: 'Kiosk', subtitle: 'Estação kiosk de qualidade' }
});

const SAFETY_VIEWS = Object.freeze({
  governance: { label: 'GHE & Matriz de Risco', subtitle: 'Governança SST' },
  telemetry: { label: 'Telemetria SST', subtitle: 'Telemetria operacional SST' },
  cognitive: { label: 'Inteligência SST', subtitle: 'Painéis cognitivos SST' },
  executive: { label: 'Executivo SST', subtitle: 'Visão executiva SST' },
  rollout: { label: 'Rollout SST', subtitle: 'Rollout e maturidade SST' },
  incident: { label: 'Incidentes', subtitle: 'Gestão de incidentes SST' },
  ptw: { label: 'PT / LOTO', subtitle: 'Permissão de trabalho e LOTO' },
  epi: { label: 'EPI / EPC', subtitle: 'Equipamentos de proteção' },
  pilot: { label: 'Pilot & validação', subtitle: 'Pilot operacional SST' }
});

const SAFETY_ROUTES = Object.freeze({
  inspection: { label: 'Inspeção de campo', subtitle: 'Inspeção operacional SST' }
});

const ENVIRONMENT_VIEWS = Object.freeze({
  water: { label: 'Água', subtitle: 'Gestão hídrica operacional' },
  effluent: { label: 'Efluentes', subtitle: 'Controlo de efluentes' },
  emissions: { label: 'Emissões', subtitle: 'Monitorização de emissões' },
  waste: { label: 'Resíduos', subtitle: 'Gestão de resíduos' },
  field: { label: 'Campo', subtitle: 'Operações de campo ambiental' },
  'effluent-nc': { label: 'NC Efluentes', subtitle: 'Não conformidades de efluentes' },
  events: { label: 'Eventos', subtitle: 'Eventos operacionais ambientais' },
  esg: { label: 'ESG', subtitle: 'Governança ESG' },
  compliance: { label: 'Compliance', subtitle: 'Compliance ambiental' },
  carbon: { label: 'Carbono', subtitle: 'Pegada de carbono' },
  energy: { label: 'Energia', subtitle: 'Gestão energética' },
  sustainability: { label: 'Sustentabilidade', subtitle: 'Indicadores de sustentabilidade' },
  governance: { label: 'Governança ambiental', subtitle: 'Governança e compliance' },
  intelligence: { label: 'Inteligência ambiental', subtitle: 'Inteligência operacional' },
  rollout: { label: 'Rollout ambiental', subtitle: 'Rollout e maturidade' },
  telemetry: { label: 'Telemetria ambiental', subtitle: 'Telemetria operacional' },
  cognitive: { label: 'Inteligência ambiental', subtitle: 'Painéis cognitivos' },
  executive: { label: 'Executivo', subtitle: 'Visão executiva ambiental' },
  pilot: { label: 'Pilot ambiental', subtitle: 'Pilot e rollout' },
  maturity: { label: 'Maturidade', subtitle: 'Maturidade operacional' },
  ecosystem: { label: 'Correlação ecossistema', subtitle: 'Correlação cross-domínio' },
  correlation: { label: 'Correlação', subtitle: 'Correlação cross-domínio' },
  hardening: { label: 'Hardening', subtitle: 'Enterprise hardening' },
  resilience: { label: 'Resiliência', subtitle: 'Resiliência enterprise' },
  'maturity-hardening': { label: 'Maturidade hardening', subtitle: 'Maturidade e hardening' }
});

const LOGISTICS_HUB_VIEWS = Object.freeze({
  receiving: { label: 'Recebimento', subtitle: 'Operações de recebimento' },
  shipping: { label: 'Expedição', subtitle: 'Operações de expedição' },
  governance: { label: 'Governança logística', subtitle: 'Governança operacional' },
  telemetry: { label: 'Telemetria logística', subtitle: 'Telemetria operacional' },
  cognitive: { label: 'Inteligência logística', subtitle: 'Painéis cognitivos' },
  executive: { label: 'Executivo logístico', subtitle: 'Visão executiva' },
  maturity: { label: 'Maturidade', subtitle: 'Maturidade operacional logística' }
});

function buildBreadcrumb(domain, mod) {
  const domainPath = domain.domainLandingPath || domain.basePath;
  const items = [
    { label: IMPETUS_ROOT.label, path: IMPETUS_ROOT.path, title: IMPETUS_ROOT.title },
    { label: domain.label, path: domainPath, title: `Landing ${domain.label}` }
  ];
  if (mod) {
    items.push({ label: mod.label, current: true, title: 'Página actual' });
  } else {
    items[items.length - 1] = { ...items[items.length - 1], current: true, title: 'Página actual' };
  }
  return items;
}

export function buildEoxNavigationConfig({
  domainId,
  domainLabel,
  moduleLabel,
  modulePath,
  subtitle,
  version,
  phase,
  backTarget,
  breadcrumb,
  ccBackTarget = CC,
  deepLink = null,
  actions = []
}) {
  return Object.freeze({
    domain: domainLabel,
    domainId,
    module: moduleLabel,
    modulePath,
    subtitle: subtitle || '',
    version: version || '',
    phase: phase || EOX_PHASE,
    backTarget,
    ccBackTarget,
    breadcrumb: breadcrumb || [],
    deepLink,
    actions,
    hierarchyLevels: ['centro_cognitivo', 'domain', 'module', 'entity', 'position', 'movements'],
    eoxPhase: EOX_PHASE,
    navPhase: EOX_PHASE
  });
}

/** Compat NAV-002 */
export const buildOperationalNavigationConfig = buildEoxNavigationConfig;

function resolveViewOrRoute(pathname, basePath, viewKey, viewMap, routeMap) {
  const rel = pathname.replace(basePath, '').replace(/^\//, '');
  if (rel && routeMap[rel]) return routeMap[rel];
  if (viewKey && viewMap[viewKey]) return viewMap[viewKey];
  return null;
}

export function resolveLogisticsOperationalNavigation(pathname, overrides = {}) {
  const domain = EOX_DOMAIN_REGISTRY.logistics_wms;
  const segment = pathname.replace(domain.basePath, '').replace(/^\//, '').split('/')[0] || '';
  const mod = getWmsModuleBySegment(segment);

  if (!mod) {
    return buildEoxNavigationConfig({
      domainId: domain.id,
      domainLabel: domain.label,
      moduleLabel: 'Logística',
      modulePath: domain.domainLandingPath,
      subtitle: domain.hubSubtitle,
      version: domain.version,
      phase: domain.defaultPhase,
      backTarget: domain.backTarget,
      breadcrumb: buildBreadcrumb(domain, null)
    });
  }

  const phase = overrides.phase || LOGISTICS_MODULE_PHASES[mod.id] || domain.defaultPhase;

  return buildEoxNavigationConfig({
    domainId: domain.id,
    domainLabel: domain.label,
    moduleLabel: mod.label,
    modulePath: mod.standalonePath,
    subtitle: mod.description,
    version: domain.version,
    phase,
    backTarget: domain.backTarget,
    breadcrumb: buildBreadcrumb(domain, mod)
  });
}

export function resolveLogisticsHubNavigation(pathname, search = '') {
  const domain = EOX_DOMAIN_REGISTRY.logistics_hub;
  const view = new URLSearchParams(search).get('view');
  const viewMod = view ? LOGISTICS_HUB_VIEWS[view] : null;
  const mod = viewMod ? { label: viewMod.label, description: viewMod.subtitle } : null;

  return buildEoxNavigationConfig({
    domainId: domain.id,
    domainLabel: domain.label,
    moduleLabel: mod?.label || domain.label,
    modulePath: domain.domainLandingPath + (view ? `?view=${view}` : ''),
    subtitle: mod?.description || domain.hubSubtitle,
    version: domain.version,
    phase: domain.defaultPhase,
    backTarget: domain.backTarget,
    breadcrumb: buildBreadcrumb(domain, mod)
  });
}

export function resolveQualityOperationalNavigation(pathname, search = '') {
  const domain = EOX_DOMAIN_REGISTRY.quality;
  const view = new URLSearchParams(search).get('view');
  const resolved =
    resolveViewOrRoute(pathname, domain.basePath, view, QUALITY_VIEWS, QUALITY_ROUTES) || null;
  const mod = resolved ? { label: resolved.label, description: resolved.subtitle } : null;

  return buildEoxNavigationConfig({
    domainId: domain.id,
    domainLabel: domain.label,
    moduleLabel: mod?.label || domain.label,
    modulePath: pathname,
    subtitle: mod?.description || domain.hubSubtitle,
    version: domain.version,
    phase: domain.defaultPhase,
    backTarget: domain.backTarget,
    breadcrumb: buildBreadcrumb(domain, mod)
  });
}

export function resolveSafetyOperationalNavigation(pathname, search = '') {
  const domain = EOX_DOMAIN_REGISTRY.safety;
  const view = new URLSearchParams(search).get('view');
  const resolved =
    resolveViewOrRoute(pathname, domain.basePath, view, SAFETY_VIEWS, SAFETY_ROUTES) || null;
  const mod = resolved ? { label: resolved.label, description: resolved.subtitle } : null;

  return buildEoxNavigationConfig({
    domainId: domain.id,
    domainLabel: domain.label,
    moduleLabel: mod?.label || domain.label,
    modulePath: pathname + (search || ''),
    subtitle: mod?.description || domain.hubSubtitle,
    version: domain.version,
    phase: domain.defaultPhase,
    backTarget: domain.backTarget,
    breadcrumb: buildBreadcrumb(domain, mod)
  });
}

export function resolveEnvironmentOperationalNavigation(pathname, search = '') {
  const domain = EOX_DOMAIN_REGISTRY.environment;
  const view = new URLSearchParams(search).get('view');
  const resolved = view && ENVIRONMENT_VIEWS[view] ? ENVIRONMENT_VIEWS[view] : null;
  const mod = resolved ? { label: resolved.label, description: resolved.subtitle } : null;

  return buildEoxNavigationConfig({
    domainId: domain.id,
    domainLabel: domain.label,
    moduleLabel: mod?.label || domain.label,
    modulePath: pathname + (search || ''),
    subtitle: mod?.description || domain.hubSubtitle,
    version: domain.version,
    phase: domain.defaultPhase,
    backTarget: domain.backTarget,
    breadcrumb: buildBreadcrumb(domain, mod)
  });
}

export function resolveProductionOperationalNavigation(pathname) {
  const domain = EOX_DOMAIN_REGISTRY.production;
  return buildEoxNavigationConfig({
    domainId: domain.id,
    domainLabel: domain.label,
    moduleLabel: domain.label,
    modulePath: pathname,
    subtitle: domain.hubSubtitle,
    version: domain.version,
    phase: domain.defaultPhase,
    backTarget: domain.backTarget,
    breadcrumb: buildBreadcrumb(domain, null)
  });
}
