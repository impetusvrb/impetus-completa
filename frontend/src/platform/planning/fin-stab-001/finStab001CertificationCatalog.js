/**
 * FIN-STAB-001 — CFO end-to-end usage scenarios (certification metrics).
 * READ ONLY — no product implementation.
 */
import { FINANCE_DOMAIN_IDENTITY } from '../../../domains/finance/metadata/financeDomainMetadata.js';
import { FINANCE_OFFICIAL_DEEP_LINKS, FINANCE_SIDEBAR_MENU_ITEMS } from '../../../domains/finance/metadata/financeNavigationMetadata.js';
import { FINANCE_LEGACY_REDIRECTS } from '../../../domains/finance/compatibility/financeLegacyCompatibility.js';
import { FINANCE_WORKSPACE_INTEGRATIONS } from '../../../domains/finance/integration/financeIntegrationLayer.js';

export const FIN_STAB_001_PHASE = 'FIN-STAB-001';
export const FIN_STAB_001_PRINCIPLE = 'STABILIZE BEFORE EXPAND';

/** Success metrics — Diretor Financeiro journeys (ponte para FIN-EVOLVE-002). */
export const FIN_STAB_001_CFO_JOURNEYS = Object.freeze([
  Object.freeze({
    id: 'enter_hub',
    label: 'Entrar no Hub Finance',
    path: FINANCE_DOMAIN_IDENTITY.landingRoute,
    expects: Object.freeze(['identity_Finance', 'workspace_hub', 'eox_shell'])
  }),
  Object.freeze({
    id: 'open_costs',
    label: 'Abrir Custos',
    path: FINANCE_OFFICIAL_DEEP_LINKS.cost_center,
    expects: Object.freeze(['route_/app/finance/costs', 'reuses_CentroCustosExecutivo'])
  }),
  Object.freeze({
    id: 'open_leakage',
    label: 'Abrir Leakage',
    path: FINANCE_OFFICIAL_DEEP_LINKS.leak_map,
    expects: Object.freeze(['route_/app/finance/leakage', 'reuses_MapaVazamentoFinanceiro'])
  }),
  Object.freeze({
    id: 'return_hub',
    label: 'Retornar ao Hub',
    path: FINANCE_DOMAIN_IDENTITY.landingRoute,
    from: FINANCE_OFFICIAL_DEEP_LINKS.cost_center,
    expects: Object.freeze(['breadcrumb_Finance', 'backTarget_Finance'])
  }),
  Object.freeze({
    id: 'access_via_menu',
    label: 'Acessar pelo menu',
    path: FINANCE_SIDEBAR_MENU_ITEMS[0].path,
    menuLabel: FINANCE_SIDEBAR_MENU_ITEMS[0].label,
    expects: Object.freeze(['menu_label_Finance', 'path_/app/finance'])
  })
]);

export const FIN_STAB_001_GATE_FOR_EVOLVE_002 = Object.freeze({
  requires: Object.freeze([
    'FIN-STAB-001 certified',
    'no critical integration regressions',
    'Hub Finance stable',
    'navigation stable',
    'PLATFORM-2026.1 baseline intact'
  ]),
  nextProgram: 'FIN-EVOLVE-002',
  nextRelease: '2.0'
});

export function listCfoJourneys() {
  return FIN_STAB_001_CFO_JOURNEYS;
}

export function validateFinStab001CertificationSnapshot() {
  const issues = [];
  if (FINANCE_DOMAIN_IDENTITY.displayName !== 'Finance') {
    issues.push('identity must remain Finance');
  }
  if (FINANCE_SIDEBAR_MENU_ITEMS[0]?.label !== 'Finance') {
    issues.push('sidebar label must be Finance');
  }
  if (!FINANCE_OFFICIAL_DEEP_LINKS.cost_center.startsWith('/app/finance')) {
    issues.push('costs deep-link must be official finance route');
  }
  if (FINANCE_LEGACY_REDIRECTS.length < 2) {
    issues.push('legacy redirects required');
  }
  const comps = FINANCE_WORKSPACE_INTEGRATIONS.map((m) => m.component);
  if (!comps.includes('CentroCustosExecutivo') || !comps.includes('MapaVazamentoFinanceiro')) {
    issues.push('integration reuse broken');
  }
  if (FIN_STAB_001_CFO_JOURNEYS.length < 5) {
    issues.push('CFO journeys incomplete');
  }
  return { valid: issues.length === 0, issues, journeys: FIN_STAB_001_CFO_JOURNEYS.length };
}
