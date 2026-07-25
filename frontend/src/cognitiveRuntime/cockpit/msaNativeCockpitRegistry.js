/**
 * GF-011 — Registries msa_native + lazy hubs.
 */
import { lazy } from 'react';

export const MSA_RUNTIME_ID = 'msa_native';

/** @type {Record<string, string>} center_id → hub_key */
export const MSA_CENTER_REGISTRY = Object.freeze({
  msa_study_governance_ops: 'study_governance',
  msa_gauge_management_ops: 'gauge_management',
  msa_variable_grr_ops: 'variable_grr',
  msa_attribute_agreement_ops: 'attribute_agreement',
  msa_calibration_ops: 'calibration',
  msa_cognitive_ops: 'cognitive'
});

/** @type {Record<string, { label: string, component: string, ready: boolean }>} */
export const MSA_HUB_REGISTRY = Object.freeze({
  study_governance: {
    label: 'Governança de Estudos',
    component: 'StudyGovernanceHub',
    ready: true
  },
  gauge_management: {
    label: 'Gestão de Instrumentos',
    component: 'GaugeManagementHub',
    ready: true
  },
  variable_grr: {
    label: 'GRR Variável',
    component: 'VariableGrrHub',
    ready: true
  },
  attribute_agreement: {
    label: 'Concordância Atributo',
    component: 'AttributeAgreementHub',
    ready: true
  },
  calibration: {
    label: 'Calibração',
    component: 'CalibrationHub',
    ready: true
  },
  cognitive: {
    label: 'Contexto MSA',
    component: 'CognitiveMsaHub',
    ready: true
  }
});

export const MSA_HUB_COMPONENTS = Object.freeze({
  study_governance: lazy(() => import('../../domains/msa/cockpit/StudyGovernanceHub.jsx')),
  gauge_management: lazy(() => import('../../domains/msa/cockpit/GaugeManagementHub.jsx')),
  variable_grr: lazy(() => import('../../domains/msa/cockpit/VariableGrrHub.jsx')),
  attribute_agreement: lazy(() => import('../../domains/msa/cockpit/AttributeAgreementHub.jsx')),
  calibration: lazy(() => import('../../domains/msa/cockpit/CalibrationHub.jsx')),
  cognitive: lazy(() => import('../../domains/msa/cockpit/CognitiveMsaHub.jsx'))
});

export const MSA_RUNTIME_REGISTRY = Object.freeze({
  runtime_id: MSA_RUNTIME_ID,
  runtime_name: MSA_RUNTIME_ID,
  cockpit_mode: MSA_RUNTIME_ID,
  foundation_gf: 'GF-008',
  promotion_gf: 'GF-011',
  inactive: true,
  centers: MSA_CENTER_REGISTRY,
  hubs: MSA_HUB_REGISTRY
});

export const MSA_PROMOTION_REGISTRY = Object.freeze({
  runtime_id: MSA_RUNTIME_ID,
  promotion_active: false,
  render_active: false,
  component: 'MsaNativeCockpitPromotion'
});

export const MSA_DASHBOARD_REGISTRY = Object.freeze({
  runtime: MSA_RUNTIME_REGISTRY,
  promotion: MSA_PROMOTION_REGISTRY,
  promotion_active: false,
  consolidation_active: false
});

export const MSA_PLACEHOLDER_WIDGET_IDS = Object.freeze(['qualidade']);

export function resolvePromotedMsaHubs(centers = []) {
  const order = Object.keys(MSA_HUB_REGISTRY);
  const bucket = new Map();
  for (const c of centers || []) {
    const hubKey = MSA_CENTER_REGISTRY[c?.center_id];
    if (!hubKey) continue;
    if (!bucket.has(hubKey)) {
      const meta = MSA_HUB_REGISTRY[hubKey] || {};
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

export function resolveAllMsaHubsForPromotion(centers = []) {
  return Object.keys(MSA_HUB_REGISTRY).map((hubKey) => {
    const meta = MSA_HUB_REGISTRY[hubKey];
    const centerIds = (centers || [])
      .filter((c) => MSA_CENTER_REGISTRY[c?.center_id] === hubKey)
      .map((c) => c.center_id);
    return {
      hubKey,
      label: meta.label,
      component: meta.component,
      centerIds
    };
  });
}

export function shouldSuppressMsaPlaceholderWidgets(runtime) {
  return runtime?.consolidation_applied === true && runtime?.cockpit_mode === MSA_RUNTIME_ID;
}

export default MSA_RUNTIME_REGISTRY;
