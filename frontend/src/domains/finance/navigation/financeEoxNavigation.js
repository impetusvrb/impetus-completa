/**
 * FIN-EVOLVE-001A — Resolução EOX Finance (consome metadata provider único).
 */
import { buildFinanceEoxNavigationConfig } from '../metadata/financeNavigationMetadata.js';

export function resolveFinanceOperationalNavigation(pathname, search = '') {
  return buildFinanceEoxNavigationConfig(pathname, search);
}

/** Compat EOX barrel */
export const resolveFinanceNavigation = resolveFinanceOperationalNavigation;
