/**
 * FIN-EVOLVE-001A — Resolver de experiência do workspace Finance.
 */
import { FINANCE_DOMAIN_IDENTITY } from '../metadata/financeDomainMetadata.js';
import { FINANCE_WORKSPACE_MODULES } from '../metadata/financeNavigationMetadata.js';
import { FINANCE_WORKSPACE_INTEGRATIONS } from '../integration/financeIntegrationLayer.js';
import { canAccessFinanceBilling } from '../navigation/financeAccess.js';

/** Secções hierárquicas apresentadas no hub Finance. */
export const FINANCE_WORKSPACE_HIERARCHY = Object.freeze([
  Object.freeze({
    id: 'domain',
    label: FINANCE_DOMAIN_IDENTITY.displayName,
    level: 0
  }),
  Object.freeze({
    id: 'costs',
    label: 'Custos Industriais',
    parentId: 'domain',
    moduleId: 'costs',
    level: 1
  }),
  Object.freeze({
    id: 'leakage',
    label: 'Mapa de Vazamentos',
    parentId: 'domain',
    moduleId: 'leakage',
    level: 1
  }),
  Object.freeze({
    id: 'billing',
    label: 'Billing',
    parentId: 'domain',
    moduleId: 'billing',
    level: 1
  }),
  Object.freeze({
    id: 'ledger',
    label: 'Ledger',
    parentId: 'domain',
    moduleId: 'ledger',
    level: 1,
    composeOnly: true
  }),
  Object.freeze({
    id: 'wallet',
    label: 'Wallet',
    parentId: 'domain',
    moduleId: 'wallet',
    level: 1,
    composeOnly: true
  }),
  Object.freeze({
    id: 'twin',
    label: 'Digital Twin Financeiro',
    parentId: 'domain',
    moduleId: 'twin',
    level: 1,
    composeOnly: true
  }),
  Object.freeze({
    id: 'whatif',
    label: 'What-if Analysis',
    parentId: 'domain',
    moduleId: 'whatif',
    level: 1,
    composeOnly: true
  }),
  Object.freeze({
    id: 'prediction',
    label: 'Previsões',
    parentId: 'domain',
    moduleId: 'prediction',
    level: 1,
    composeOnly: true
  })
]);

function _mergeModulePresentation(node, integration) {
  const nav = FINANCE_WORKSPACE_MODULES.find((m) => m.id === node.moduleId);
  return Object.freeze({
    ...node,
    label: nav?.shortLabel || nav?.label || node.label,
    path: nav?.officialRoute || nav?.path,
    subtitle: nav?.subtitle || integration?.description || '',
    capabilityId: integration?.capabilityId || null,
    component: integration?.component || null,
    apiContract: integration?.apiContract || null,
    external: integration?.external || false,
    composeOnly: node.composeOnly || nav?.composeOnly || false
  });
}

/**
 * Resolve módulos visíveis no workspace Finance para o utilizador actual.
 */
export function resolveFinanceWorkspace(user) {
  const billingAllowed = canAccessFinanceBilling(user);
  const hierarchyIds = [
    'costs',
    'leakage',
    'billing',
    'ledger',
    'wallet',
    'twin',
    'whatif',
    'prediction'
  ];

  const modules = hierarchyIds
    .map((id) => {
      const node = FINANCE_WORKSPACE_HIERARCHY.find((h) => h.id === id);
      const integration = FINANCE_WORKSPACE_INTEGRATIONS.find((m) => m.id === id);
      if (!node) return null;
      if ((id === 'billing' || id === 'ledger' || id === 'wallet') && !billingAllowed) return null;
      return _mergeModulePresentation(node, integration);
    })
    .filter(Boolean);

  return Object.freeze({
    domain: FINANCE_DOMAIN_IDENTITY,
    workspaceName: FINANCE_DOMAIN_IDENTITY.workspaceName,
    landingRoute: FINANCE_DOMAIN_IDENTITY.landingRoute,
    hierarchy: FINANCE_WORKSPACE_HIERARCHY,
    modules,
    phase: FINANCE_DOMAIN_IDENTITY.phase
  });
}

export function resolveFinanceWorkspaceModule(moduleId, user) {
  const workspace = resolveFinanceWorkspace(user);
  return workspace.modules.find((m) => m.moduleId === moduleId || m.id === moduleId) ?? null;
}
