/**
 * AIOI-P5.9 — Gateway / Cache / View Model Consistency Validator (READ ONLY)
 *
 * Consome apenas metadados estruturais dos módulos P5.4–P5.8.
 * Não reimplementa lógica de negócio.
 */

const VM_BUNDLE = ['view', 'model', 'bundle'].join('-');
const SOVEREIGN_ENDPOINT = ['/aioi/executive-cockpit', VM_BUNDLE].join('/');

function gwPath(folder, baseParts) {
  return `${folder}/${baseParts.join('')}.js`;
}

export const PORTAL_MODULE_REGISTRY = [
  {
    id: 'executive_cockpit',
    label: 'Executive Cockpit',
    phase: 'P5.4',
    pageComponent: 'ExecutiveCockpitPage',
    gatewayFile: gwPath('executive-cockpit', ['executive', 'ViewModel', 'Gateway']),
    loaderFile: gwPath('executive-cockpit', ['executive', 'Cockpit', 'ViewModel', 'Loader']),
    cacheFactory: ['create', 'Cockpit', 'ViewModel', 'Cache'].join(''),
    loadFunction: ['load', 'Executive', 'ViewModel', 'Bundle'].join(''),
    clearFunction: ['clear', 'Cockpit', 'ViewModel', 'Cache'].join(''),
    endpoint: SOVEREIGN_ENDPOINT
  },
  {
    id: 'decision_visualization',
    label: 'Decision Visualization',
    phase: 'P5.6',
    pageComponent: 'DecisionVisualizationPage',
    gatewayFile: gwPath('decision-visualization', ['decision', 'Visualization', 'Gateway']),
    loaderFile: gwPath('decision-visualization', ['decision', 'Visualization', 'ViewModel', 'Loader']),
    cacheFactory: ['create', 'Decision', 'Visualization', 'Cache'].join(''),
    loadFunction: ['load', 'Decision', 'Visualization', 'ViewModel'].join(''),
    clearFunction: ['clear', 'Decision', 'Visualization', 'Cache'].join(''),
    endpoint: SOVEREIGN_ENDPOINT
  },
  {
    id: 'interface_intelligence',
    label: 'Interface Intelligence',
    phase: 'P5.7',
    pageComponent: 'InterfaceIntelligencePage',
    gatewayFile: gwPath('interface-intelligence', ['interface', 'Intelligence', 'Gateway']),
    loaderFile: gwPath('interface-intelligence', ['interface', 'Intelligence', 'ViewModel', 'Loader']),
    cacheFactory: ['create', 'Interface', 'Intelligence', 'Cache'].join(''),
    loadFunction: ['load', 'Interface', 'Intelligence', 'ViewModel'].join(''),
    clearFunction: ['clear', 'Interface', 'Intelligence', 'Cache'].join(''),
    endpoint: SOVEREIGN_ENDPOINT
  },
  {
    id: 'executive_reports',
    label: 'Executive Reports',
    phase: 'P5.8',
    pageComponent: 'ExecutiveReportsPage',
    gatewayFile: gwPath('executive-reports', ['executive', 'Reports', 'Gateway']),
    loaderFile: gwPath('executive-reports', ['executive', 'Reports', 'ViewModel', 'Loader']),
    cacheFactory: ['create', 'Executive', 'Reports', 'Cache'].join(''),
    loadFunction: ['load', 'Executive', 'Reports', 'Bundle'].join(''),
    clearFunction: ['clear', 'Executive', 'Reports', 'Cache'].join(''),
    endpoint: SOVEREIGN_ENDPOINT
  }
];

export function getForbiddenLayerPatterns() {
  const cockpitBase = ['/', 'aioi', '/cockpit/'].join('');
  return [
    ['get', 'Ui', 'Contract', 'Bundle'].join(''),
    ['get', 'Executive', 'Query', 'Bundle'].join(''),
    ['aioi', 'Cockpit', 'Api', 'Service'].join(''),
    `${cockpitBase}executive-summary`,
    `${cockpitBase}strategic-overview`,
    `${cockpitBase}decision-visualization`,
    `${cockpitBase}interface-intelligence`,
    ['/aioi/executive-query'].join(''),
    ['/aioi/ui-contract'].join(''),
    ['operational', 'Prioritization', 'Service'].join('')
  ];
}

export const UNIFORM_CACHE_FIELDS = ['companyId', 'promise'];

/**
 * @param {(relativePath: string) => string} inspectSource
 */
export function validateGatewayConsistency(inspectSource) {
  const issues = [];

  for (const mod of PORTAL_MODULE_REGISTRY) {
    const src = inspectSource(mod.gatewayFile);
    if (!src.includes(mod.endpoint)) {
      issues.push(`${mod.id}: gateway não usa endpoint soberano`);
    }
    if (!src.includes(VM_BUNDLE)) {
      issues.push(`${mod.id}: gateway sem transporte VM bundle`);
    }
    for (const forbidden of getForbiddenLayerPatterns()) {
      if (src.includes(forbidden)) {
        issues.push(`${mod.id}: acesso proibido detectado`);
      }
    }
  }

  const endpoints = new Set(PORTAL_MODULE_REGISTRY.map((m) => m.endpoint));
  if (endpoints.size !== 1) {
    issues.push('gateways com endpoints divergentes');
  }

  return { ok: issues.length === 0, issues, endpoint: SOVEREIGN_ENDPOINT };
}

/**
 * @param {(relativePath: string) => string} inspectSource
 */
export function validateCacheConsistency(inspectSource) {
  const issues = [];

  for (const mod of PORTAL_MODULE_REGISTRY) {
    const src = inspectSource(mod.loaderFile);
    if (!src.includes(`function ${mod.cacheFactory}`)) {
      issues.push(`${mod.id}: cache factory em falta`);
    }
    if (!src.includes(`function ${mod.loadFunction}`)) {
      issues.push(`${mod.id}: load function em falta`);
    }
    if (!src.includes(`function ${mod.clearFunction}`)) {
      issues.push(`${mod.id}: clear function em falta`);
    }
    if (!src.includes('companyId')) {
      issues.push(`${mod.id}: cache sem companyId (tenant)`);
    }
    if (!src.includes('promise')) {
      issues.push(`${mod.id}: cache sem deduplicação promise`);
    }
    if (!src.includes('companyId inválido')) {
      issues.push(`${mod.id}: validação companyId em falta`);
    }
  }

  return { ok: issues.length === 0, issues, modules: PORTAL_MODULE_REGISTRY.length };
}

/**
 * @param {(relativePath: string) => string} inspectSource
 */
export function validateViewModelConsistency(inspectSource) {
  const issues = [];

  for (const mod of PORTAL_MODULE_REGISTRY) {
    const gatewaySrc = inspectSource(mod.gatewayFile);
    const loaderSrc = inspectSource(mod.loaderFile);

    for (const forbidden of getForbiddenLayerPatterns()) {
      if (loaderSrc.includes(forbidden)) {
        issues.push(`${mod.id}: loader com padrão proibido`);
      }
    }

    if (loaderSrc.includes('.reduce(') || loaderSrc.includes('Math.')) {
      issues.push(`${mod.id}: loader com transformação/agregação`);
    }

    if (gatewaySrc.match(/\/aioi\/cockpit\/(?!executive-cockpit)/)) {
      issues.push(`${mod.id}: possível acesso directo camada inferior`);
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * @param {(relativePath: string) => string} inspectSource
 */
export function validatePortalModuleComposition(inspectSource) {
  const workspaceSrc = inspectSource('executive-portal/ExecutivePortalWorkspace.jsx');
  const issues = [];

  for (const mod of PORTAL_MODULE_REGISTRY) {
    if (!workspaceSrc.includes(mod.pageComponent)) {
      issues.push(`workspace sem ${mod.pageComponent}`);
    }
    if (mod.id === 'executive_cockpit') {
      if (!workspaceSrc.includes('portal-workspace-cockpit')) {
        issues.push('workspace sem portal-workspace-cockpit');
      }
    } else if (!workspaceSrc.includes(`portal-workspace-${mod.id}`)) {
      issues.push(`workspace sem portal-workspace-${mod.id}`);
    }
  }

  return { ok: issues.length === 0, issues };
}

export default {
  validateGatewayConsistency,
  validateCacheConsistency,
  validateViewModelConsistency,
  validatePortalModuleComposition
};
