/**
 * INC-042 — Registries logistics_native + lazy hubs.
 */
import { lazy } from 'react';

export const LOGISTICS_RUNTIME_ID = 'logistics_native';

/** @type {Record<string, string>} center_id → hub_key */
export const LOGISTICS_CENTER_REGISTRY = Object.freeze({
  logistics_operational_inventory: 'warehouse_governance',
  logistics_inbound_ops: 'supplier',
  logistics_outbound_ops: 'distribution',
  logistics_fleet_ops: 'fleet',
  logistics_telemetry_dock: 'telemetry',
  logistics_traceability: 'supplier',
  logistics_narrative: 'cognitive',
  logistics_decision_support: 'cognitive'
});

/** @type {Record<string, { label: string, component: string, ready: boolean }>} */
export const LOGISTICS_HUB_REGISTRY = Object.freeze({
  warehouse_governance: {
    label: 'Governança WMS',
    component: 'WarehouseGovernanceHub',
    ready: true
  },
  inventory_cognitive: {
    label: 'Inventário cognitivo',
    component: 'InventoryCognitiveHub',
    ready: true
  },
  telemetry: {
    label: 'Telemetria docas',
    component: 'WarehouseTelemetryHub',
    ready: true
  },
  fleet: {
    label: 'Inteligência frota',
    component: 'FleetIntelligenceHub',
    ready: true
  },
  distribution: {
    label: 'Expedição / OTIF',
    component: 'DistributionHub',
    ready: true
  },
  supplier: {
    label: 'Fornecedores / rastreio',
    component: 'SupplierDeliveryHub',
    ready: true
  },
  cognitive: {
    label: 'IA contextual logística',
    component: 'CognitiveLogisticsHub',
    ready: true
  }
});

export const LOGISTICS_HUB_COMPONENTS = Object.freeze({
  warehouse_governance: lazy(() => import('../../domains/logistics/cockpit/WarehouseGovernanceHub.jsx')),
  inventory_cognitive: lazy(() => import('../../domains/logistics/cockpit/InventoryCognitiveHub.jsx')),
  telemetry: lazy(() => import('../../domains/logistics/cockpit/WarehouseTelemetryHub.jsx')),
  fleet: lazy(() => import('../../domains/logistics/cockpit/FleetIntelligenceHub.jsx')),
  distribution: lazy(() => import('../../domains/logistics/cockpit/DistributionHub.jsx')),
  supplier: lazy(() => import('../../domains/logistics/cockpit/SupplierDeliveryHub.jsx')),
  cognitive: lazy(() => import('../../domains/logistics/cockpit/CognitiveLogisticsHub.jsx'))
});

export const LOGISTICS_RUNTIME_REGISTRY = Object.freeze({
  runtime_id: LOGISTICS_RUNTIME_ID,
  runtime_name: LOGISTICS_RUNTIME_ID,
  cockpit_mode: LOGISTICS_RUNTIME_ID,
  foundation_inc: 'INC-038',
  promotion_inc: 'INC-042',
  inactive: true,
  centers: LOGISTICS_CENTER_REGISTRY,
  hubs: LOGISTICS_HUB_REGISTRY
});

export const LOGISTICS_PLACEHOLDER_WIDGET_IDS = Object.freeze(['logistica', 'estoque']);

/**
 * Resolve hubs promovidos a partir dos centers Z.23.
 * @param {Array<{ center_id?: string }>} centers
 */
export function resolvePromotedLogisticsHubs(centers = []) {
  const order = Object.keys(LOGISTICS_HUB_REGISTRY);
  const bucket = new Map();
  for (const c of centers || []) {
    const hubKey = LOGISTICS_CENTER_REGISTRY[c?.center_id];
    if (!hubKey) continue;
    if (!bucket.has(hubKey)) {
      const meta = LOGISTICS_HUB_REGISTRY[hubKey] || {};
      bucket.set(hubKey, {
        hubKey,
        label: meta.label || hubKey,
        component: meta.component || hubKey,
        centerIds: []
      });
    }
    bucket.get(hubKey).centerIds.push(c.center_id);
  }
  return order
    .filter((k) => bucket.has(k))
    .map((k) => bucket.get(k));
}

/**
 * INC-042 — Todos os hubs registados quando runtime consolidado (estados honestos).
 */
export function resolveAllLogisticsHubsForPromotion(centers = []) {
  return Object.keys(LOGISTICS_HUB_REGISTRY).map((hubKey) => {
    const meta = LOGISTICS_HUB_REGISTRY[hubKey];
    const centerIds = (centers || [])
      .filter((c) => LOGISTICS_CENTER_REGISTRY[c?.center_id] === hubKey)
      .map((c) => c.center_id);
    return {
      hubKey,
      label: meta.label,
      component: meta.component,
      centerIds
    };
  });
}

export function shouldSuppressLogisticsPlaceholderWidgets(runtime) {
  return runtime?.consolidation_applied === true && runtime?.cockpit_mode === LOGISTICS_RUNTIME_ID;
}

export default LOGISTICS_RUNTIME_REGISTRY;
