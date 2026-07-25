/**
 * GF-004 — Registries ppap_native + lazy hubs.
 */
import { lazy } from 'react';

export const PPAP_RUNTIME_ID = 'ppap_native';

/** @type {Record<string, string>} center_id → hub_key */
export const PPAP_CENTER_REGISTRY = Object.freeze({
  ppap_submission_governance: 'submission_governance',
  ppap_supplier_approval_ops: 'supplier_approval',
  ppap_dimensional_ops: 'dimensional',
  ppap_capability_ops: 'capability',
  ppap_engineering_ops: 'engineering',
  ppap_cognitive_ops: 'cognitive'
});

/** @type {Record<string, { label: string, component: string, ready: boolean }>} */
export const PPAP_HUB_REGISTRY = Object.freeze({
  submission_governance: {
    label: 'Governança Submissões',
    component: 'SubmissionGovernanceHub',
    ready: true
  },
  supplier_approval: {
    label: 'Aprovação Fornecedor',
    component: 'SupplierApprovalHub',
    ready: true
  },
  dimensional: {
    label: 'Validação Dimensional',
    component: 'DimensionalHub',
    ready: true
  },
  capability: {
    label: 'Capacidade de Processo',
    component: 'CapabilityHub',
    ready: true
  },
  engineering: {
    label: 'Alterações Engenharia',
    component: 'EngineeringHub',
    ready: true
  },
  cognitive: {
    label: 'Contexto PPAP',
    component: 'CognitivePpapHub',
    ready: true
  }
});

export const PPAP_HUB_COMPONENTS = Object.freeze({
  submission_governance: lazy(() => import('../../domains/ppap/cockpit/SubmissionGovernanceHub.jsx')),
  supplier_approval: lazy(() => import('../../domains/ppap/cockpit/SupplierApprovalHub.jsx')),
  dimensional: lazy(() => import('../../domains/ppap/cockpit/DimensionalHub.jsx')),
  capability: lazy(() => import('../../domains/ppap/cockpit/CapabilityHub.jsx')),
  engineering: lazy(() => import('../../domains/ppap/cockpit/EngineeringHub.jsx')),
  cognitive: lazy(() => import('../../domains/ppap/cockpit/CognitivePpapHub.jsx'))
});

export const PPAP_RUNTIME_REGISTRY = Object.freeze({
  runtime_id: PPAP_RUNTIME_ID,
  runtime_name: PPAP_RUNTIME_ID,
  cockpit_mode: PPAP_RUNTIME_ID,
  foundation_gf: 'GF-001',
  promotion_gf: 'GF-004',
  inactive: true,
  centers: PPAP_CENTER_REGISTRY,
  hubs: PPAP_HUB_REGISTRY
});

export const PPAP_DASHBOARD_REGISTRY = Object.freeze({
  runtime: PPAP_RUNTIME_REGISTRY,
  promotion_active: false,
  consolidation_active: false
});

export const PPAP_PLACEHOLDER_WIDGET_IDS = Object.freeze(['qualidade']);

export function resolvePromotedPpapHubs(centers = []) {
  const order = Object.keys(PPAP_HUB_REGISTRY);
  const bucket = new Map();
  for (const c of centers || []) {
    const hubKey = PPAP_CENTER_REGISTRY[c?.center_id];
    if (!hubKey) continue;
    if (!bucket.has(hubKey)) {
      const meta = PPAP_HUB_REGISTRY[hubKey] || {};
      bucket.set(hubKey, {
        hubKey,
        label: meta.label || hubKey,
        component: meta.component || hubKey,
        centerIds: []
      });
    }
    bucket.get(hubKey).centerIds.push(c.center_id);
  }
  return order.filter((k) => bucket.has(k)).map((k) => bucket.get(k));
}

export function resolveAllPpapHubsForPromotion(centers = []) {
  return Object.keys(PPAP_HUB_REGISTRY).map((hubKey) => {
    const meta = PPAP_HUB_REGISTRY[hubKey];
    const centerIds = (centers || [])
      .filter((c) => PPAP_CENTER_REGISTRY[c?.center_id] === hubKey)
      .map((c) => c.center_id);
    return {
      hubKey,
      label: meta.label,
      component: meta.component,
      centerIds
    };
  });
}

export function shouldSuppressPpapPlaceholderWidgets(runtime) {
  return runtime?.consolidation_applied === true && runtime?.cockpit_mode === PPAP_RUNTIME_ID;
}

export default PPAP_RUNTIME_REGISTRY;
