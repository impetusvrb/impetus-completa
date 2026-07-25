/**
 * GF-027 — Registries supply_native + lazy hubs (7 centros GF-021).
 */
import { lazy } from 'react';
import { isSupplyMenuVisible } from '../../domains/supply/config/supplyFeatureFlags.js';

export const SUPPLY_RUNTIME_ID = 'supply_native';

export const SUPPLY_CENTER_REGISTRY = Object.freeze({
  supply_procurement_overview: 'procurement_overview',
  supply_supplier_ops: 'supplier_ops',
  supply_inbound_ops: 'inbound_ops',
  supply_commitments_ops: 'commitments_ops',
  supply_exceptions_ops: 'exceptions_ops',
  supply_spend_ops: 'spend_ops',
  supply_narrative_ops: 'narrative_ops'
});

export const SUPPLY_HUB_REGISTRY = Object.freeze({
  procurement_overview: { label: 'Procurement Overview', component: 'ProcurementOverviewHub', ready: true },
  supplier_ops: { label: 'Supplier Operations', component: 'SupplierOpsHub', ready: true },
  inbound_ops: { label: 'Inbound Operations', component: 'InboundOpsHub', ready: true },
  commitments_ops: { label: 'Commitments', component: 'CommitmentsHub', ready: true },
  exceptions_ops: { label: 'Exceptions', component: 'ExceptionsHub', ready: true },
  spend_ops: { label: 'Spend Analysis', component: 'SpendOpsHub', ready: true },
  narrative_ops: { label: 'Narrative', component: 'NarrativeHub', ready: true }
});

export const SUPPLY_HUB_COMPONENTS = Object.freeze({
  procurement_overview: lazy(() =>
    import('../../domains/supply/cockpit/supplyHubs.jsx').then((m) => ({ default: m.ProcurementOverviewHub }))
  ),
  supplier_ops: lazy(() =>
    import('../../domains/supply/cockpit/supplyHubs.jsx').then((m) => ({ default: m.SupplierOpsHub }))
  ),
  inbound_ops: lazy(() =>
    import('../../domains/supply/cockpit/supplyHubs.jsx').then((m) => ({ default: m.InboundOpsHub }))
  ),
  commitments_ops: lazy(() =>
    import('../../domains/supply/cockpit/supplyHubs.jsx').then((m) => ({ default: m.CommitmentsHub }))
  ),
  exceptions_ops: lazy(() =>
    import('../../domains/supply/cockpit/supplyHubs.jsx').then((m) => ({ default: m.ExceptionsHub }))
  ),
  spend_ops: lazy(() =>
    import('../../domains/supply/cockpit/supplyHubs.jsx').then((m) => ({ default: m.SpendOpsHub }))
  ),
  narrative_ops: lazy(() =>
    import('../../domains/supply/cockpit/supplyHubs.jsx').then((m) => ({ default: m.NarrativeHub }))
  )
});

export function resolveAllSupplyHubsForPromotion(centers = []) {
  return Object.keys(SUPPLY_HUB_REGISTRY).map((hubKey) => {
    const meta = SUPPLY_HUB_REGISTRY[hubKey];
    const centerIds = (centers || [])
      .filter((c) => SUPPLY_CENTER_REGISTRY[c?.center_id] === hubKey)
      .map((c) => c.center_id);
    return { hubKey, label: meta.label, component: meta.component, centerIds };
  });
}

export function shouldSuppressSupplyPlaceholderWidgets(runtime) {
  if (!isSupplyMenuVisible()) return false;
  return runtime?.consolidation_applied === true && runtime?.cockpit_mode === SUPPLY_RUNTIME_ID;
}

export default SUPPLY_HUB_REGISTRY;
