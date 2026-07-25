/**
 * UX-001 — Adaptador Supply (estrutura visual; rotas existentes only).
 */
import { Package, FileText, ShoppingCart, FileSignature } from 'lucide-react';
import { getSupplyNavigationSnapshot } from '../../../domains/supply/routes/supplyWorkspaceRegistry.js';
import { isPresentationDomainAllowed } from '../domainNavigationResolver.js';

const SUPPLY_BASE = '/app/supply/workspace';

const SUPPLY_PRESENTATION_MODULES = Object.freeze([
  { id: 'suppliers', label: 'Fornecedores', icon: Package },
  { id: 'purchase-requests', label: 'Requisições', icon: FileText },
  { id: 'purchase-orders', label: 'Pedidos', icon: ShoppingCart },
  { id: 'contracts', label: 'Contratos', icon: FileSignature }
]);

/**
 * @param {object} _ctx
 * @returns {import('../presentationNavigationRegistry.js').PresentationSection|null}
 */
export function buildSupplyPresentationSection(ctx) {
  if (!isPresentationDomainAllowed('supply', ctx)) return null;
  const snap = getSupplyNavigationSnapshot();
  if (!snap.menu_visible && !snap.workspace_enabled) return null;

  return {
    domainId: 'supply',
    title: 'SUPPLY',
    items: SUPPLY_PRESENTATION_MODULES.map((m) => ({
      id: `supply_${m.id}`,
      label: m.label,
      path: SUPPLY_BASE,
      icon: m.icon
    }))
  };
}
