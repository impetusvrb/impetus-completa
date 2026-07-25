/**
 * FIN-EVOLVE-001A — Metadados de navegação Finance (menu, EOX, breadcrumbs, deep-links).
 */
import { COGNITIVE_CENTER_RETURN } from '../../../presentation/eox/eoxTokens.js';
import { buildEoxNavigationConfig } from '../../../presentation/eox/eoxRegistry.js';
import {
  FINANCE_DOMAIN_IDENTITY,
  FINANCE_EOX_DOMAIN_ENTRY,
  FIN_EVOLVE_001A_PHASE
} from './financeDomainMetadata.js';
import { FINANCE_LEGACY_REDIRECTS } from '../compatibility/financeLegacyCompatibility.js';

export const FINANCE_BASE_PATH = FINANCE_DOMAIN_IDENTITY.landingRoute;

export const FINANCE_WORKSPACE_MODULES = Object.freeze([
  Object.freeze({
    id: 'hub',
    segment: '',
    label: FINANCE_DOMAIN_IDENTITY.displayName,
    subtitle: FINANCE_DOMAIN_IDENTITY.description,
    path: FINANCE_BASE_PATH,
    breadcrumbLabel: FINANCE_DOMAIN_IDENTITY.displayName
  }),
  Object.freeze({
    id: 'costs',
    segment: 'costs',
    label: 'Centro de Custos Industriais',
    shortLabel: 'Custos Industriais',
    subtitle: 'Industrial Cost Service · custos por origem',
    path: `${FINANCE_BASE_PATH}/costs`,
    officialRoute: `${FINANCE_BASE_PATH}/costs`,
    deepLinkKey: 'cost_center',
    contextualModuleId: 'cost_center'
  }),
  Object.freeze({
    id: 'leakage',
    segment: 'leakage',
    label: 'Mapa de Vazamentos',
    shortLabel: 'Mapa de Vazamentos',
    subtitle: 'Financial Leakage Detector · REG-002',
    path: `${FINANCE_BASE_PATH}/leakage`,
    officialRoute: `${FINANCE_BASE_PATH}/leakage`,
    deepLinkKey: 'leak_map',
    contextualModuleId: 'losses_map'
  }),
  Object.freeze({
    id: 'billing',
    segment: 'billing',
    label: 'Billing',
    shortLabel: 'Billing',
    subtitle: 'Nexus Billing · Wallet · Ledger · Nexus IA custos',
    path: `${FINANCE_BASE_PATH}/billing`,
    officialRoute: `${FINANCE_BASE_PATH}/billing`,
    adminOnly: true
  }),
  Object.freeze({
    id: 'wallet',
    segment: 'wallet',
    label: 'Wallet',
    shortLabel: 'Wallet',
    subtitle: 'Nexus Wallet · composição billing',
    path: `${FINANCE_BASE_PATH}/billing`,
    officialRoute: `${FINANCE_BASE_PATH}/billing`,
    composeOnly: true,
    adminOnly: true
  }),
  Object.freeze({
    id: 'ledger',
    segment: 'ledger',
    label: 'Ledger',
    shortLabel: 'Ledger',
    subtitle: 'Nexus Ledger · composição billing',
    path: `${FINANCE_BASE_PATH}/billing`,
    officialRoute: `${FINANCE_BASE_PATH}/billing`,
    composeOnly: true,
    adminOnly: true
  }),
  Object.freeze({
    id: 'twin',
    segment: 'twin',
    label: 'Digital Twin Financeiro',
    shortLabel: 'Twin Financeiro',
    subtitle: 'Perspectiva económica sobre o Twin industrial · FIN-EVOLVE-2.2',
    path: `${FINANCE_BASE_PATH}/twin`,
    officialRoute: `${FINANCE_BASE_PATH}/twin`,
    composeOnly: true
  }),
  Object.freeze({
    id: 'whatif',
    segment: 'whatif',
    label: 'What-if Analysis',
    shortLabel: 'What-if',
    subtitle: 'Cenários hipotéticos · FIN-EVOLVE-2.3 · SIMULATE WITHOUT MUTATING',
    path: `${FINANCE_BASE_PATH}/whatif`,
    officialRoute: `${FINANCE_BASE_PATH}/whatif`,
    composeOnly: true
  }),
  Object.freeze({
    id: 'prediction',
    segment: 'prediction',
    label: 'Inteligência Financeira Preditiva',
    shortLabel: 'Previsões',
    subtitle: 'platform.prediction.public_api.v1 · FIN-EVOLVE-2.4 · PREDICT WITHOUT DECIDING',
    path: `${FINANCE_BASE_PATH}/prediction`,
    officialRoute: `${FINANCE_BASE_PATH}/prediction`,
    composeOnly: true
  })
]);

/** Itens de menu lateral — única definição para Layout. */
export const FINANCE_SIDEBAR_MENU_ITEMS = Object.freeze([
  Object.freeze({
    path: FINANCE_BASE_PATH,
    label: FINANCE_DOMAIN_IDENTITY.displayName,
    iconKey: 'DollarSign'
  })
]);

/** Deep-links oficiais para widgets (CenterWidget, CC widgets). */
export const FINANCE_OFFICIAL_DEEP_LINKS = Object.freeze({
  financial_intelligence: FINANCE_BASE_PATH,
  cost_center: `${FINANCE_BASE_PATH}/costs`,
  leak_map: `${FINANCE_BASE_PATH}/leakage`,
  losses_map: `${FINANCE_BASE_PATH}/leakage`,
  nexus_billing: `${FINANCE_BASE_PATH}/billing`,
  financial_twin: `${FINANCE_BASE_PATH}/twin`,
  financial_whatif: `${FINANCE_BASE_PATH}/whatif`,
  financial_prediction: `${FINANCE_BASE_PATH}/prediction`
});

/** Overrides para contextualSidebarBuilder — paths e labels oficiais. */
export const FINANCE_CONTEXTUAL_MENU_OVERRIDES = Object.freeze({
  cost_center: Object.freeze({
    label: 'Centro de Custos',
    path: `${FINANCE_BASE_PATH}/costs`
  }),
  losses_map: Object.freeze({
    label: 'Mapa de Vazamento',
    path: `${FINANCE_BASE_PATH}/leakage`
  }),
  financial_intelligence: Object.freeze({
    label: FINANCE_DOMAIN_IDENTITY.displayName,
    path: FINANCE_BASE_PATH
  })
});

export const FINANCE_NAV_REGISTRY = Object.freeze({
  phase: FIN_EVOLVE_001A_PHASE,
  domainId: FINANCE_DOMAIN_IDENTITY.id,
  basePath: FINANCE_BASE_PATH,
  landingPath: FINANCE_BASE_PATH,
  eoxVersion: FINANCE_DOMAIN_IDENTITY.eoxVersion,
  identity: FINANCE_DOMAIN_IDENTITY,
  modules: FINANCE_WORKSPACE_MODULES,
  legacyRedirects: FINANCE_LEGACY_REDIRECTS
});

export function getFinanceModuleBySegment(segment) {
  return FINANCE_WORKSPACE_MODULES.find((m) => m.segment === segment && !m.composeOnly) ?? null;
}

export function getFinanceOfficialRoute(moduleId) {
  const mod = FINANCE_WORKSPACE_MODULES.find((m) => m.id === moduleId);
  return mod?.officialRoute ?? mod?.path ?? null;
}

export function getFinanceDeepLink(deepLinkKey) {
  return FINANCE_OFFICIAL_DEEP_LINKS[deepLinkKey] ?? null;
}

/** Breadcrumb canónico: Centro Cognitivo → Finance → Módulo */
export function buildFinanceBreadcrumb(module = null) {
  const items = [
    {
      label: COGNITIVE_CENTER_RETURN.shortLabel,
      path: COGNITIVE_CENTER_RETURN.path,
      title: COGNITIVE_CENTER_RETURN.label
    },
    {
      label: FINANCE_DOMAIN_IDENTITY.displayName,
      path: FINANCE_DOMAIN_IDENTITY.landingRoute,
      title: FINANCE_DOMAIN_IDENTITY.workspaceName
    }
  ];
  if (module && module.id !== 'hub') {
    items.push({
      label: module.breadcrumbLabel || module.label,
      current: true,
      title: 'Página actual'
    });
  } else {
    items[items.length - 1] = { ...items[items.length - 1], current: true, title: 'Página actual' };
  }
  return items;
}

export function buildFinanceEoxNavigationConfig(pathname, _search = '') {
  const domain = FINANCE_EOX_DOMAIN_ENTRY;
  const rel = pathname.replace(FINANCE_BASE_PATH, '').replace(/^\//, '');
  const segment = rel.split('/')[0] || '';
  const mod = getFinanceModuleBySegment(segment) || FINANCE_WORKSPACE_MODULES[0];

  return buildEoxNavigationConfig({
    domainId: domain.id,
    domainLabel: domain.label,
    moduleLabel: mod.label,
    modulePath: mod.path,
    subtitle: mod.subtitle || domain.hubSubtitle,
    version: domain.version,
    phase: domain.defaultPhase,
    backTarget: domain.backTarget,
    ccBackTarget: domain.ccBackTarget,
    breadcrumb: buildFinanceBreadcrumb(mod)
  });
}
