/**
 * FIN-EVOLVE-001A — Compatibilidade legacy Finance (redirects · rotas preservadas).
 */
import { FINANCE_DOMAIN_IDENTITY } from '../metadata/financeDomainMetadata.js';

export const FINANCE_LEGACY_REDIRECTS = Object.freeze([
  Object.freeze({
    from: '/app/centro-custos-industriais',
    to: `${FINANCE_DOMAIN_IDENTITY.landingRoute}/costs`,
    moduleId: 'costs',
    note: 'Industrial Costs — legacy → Finance route'
  }),
  Object.freeze({
    from: '/app/mapa-vazamento-financeiro',
    to: `${FINANCE_DOMAIN_IDENTITY.landingRoute}/leakage`,
    moduleId: 'leakage',
    note: 'Financial Leakage — legacy → Finance route'
  }),
  Object.freeze({
    from: '/app/admin/nexusia-custos',
    to: `${FINANCE_DOMAIN_IDENTITY.landingRoute}/billing`,
    moduleId: 'billing',
    note: 'Nexus Billing admin — legacy → Finance route'
  })
]);

const LEGACY_PATH_SET = new Set(FINANCE_LEGACY_REDIRECTS.map((r) => r.from));

export function isFinanceLegacyPath(pathname) {
  const normalized = String(pathname || '').replace(/\/+$/, '') || '/';
  return LEGACY_PATH_SET.has(normalized);
}

export function resolveLegacyFinanceRedirect(pathname) {
  const normalized = String(pathname || '').replace(/\/+$/, '') || '/';
  const entry = FINANCE_LEGACY_REDIRECTS.find((r) => r.from === normalized);
  return entry ? entry.to : null;
}

export function getFinanceLegacyRedirectRegistry() {
  return Object.freeze({
    domainId: FINANCE_DOMAIN_IDENTITY.id,
    phase: 'FIN-EVOLVE-001A',
    pattern: 'Legacy → Redirect → Finance Route',
    redirects: FINANCE_LEGACY_REDIRECTS,
    preserved: true
  });
}

export function validateFinanceLegacyCompatibility() {
  const issues = [];
  for (const entry of FINANCE_LEGACY_REDIRECTS) {
    if (!entry.to.startsWith(FINANCE_DOMAIN_IDENTITY.landingRoute)) {
      issues.push(`${entry.from} must redirect under ${FINANCE_DOMAIN_IDENTITY.landingRoute}`);
    }
  }
  return { valid: issues.length === 0, issues };
}
