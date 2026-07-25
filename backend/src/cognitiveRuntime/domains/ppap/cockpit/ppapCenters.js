'use strict';

/**
 * GF-004 — Centers + hub mount points ppap_native (estrutura promovida).
 */

const PPAP_CENTER_IDS = Object.freeze([
  'ppap_submission_governance',
  'ppap_supplier_approval_ops',
  'ppap_dimensional_ops',
  'ppap_capability_ops',
  'ppap_engineering_ops',
  'ppap_cognitive_ops'
]);

const BLOCK_TO_CENTER = Object.freeze({
  'ppap.submission_management': 'ppap_submission_governance',
  'ppap.supplier_approval': 'ppap_supplier_approval_ops',
  'ppap.customer_requirements': 'ppap_supplier_approval_ops',
  'ppap.dimensional_validation': 'ppap_dimensional_ops',
  'ppap.material_certification': 'ppap_dimensional_ops',
  'ppap.appearance_approval': 'ppap_dimensional_ops',
  'ppap.performance_validation': 'ppap_dimensional_ops',
  'ppap.process_capability': 'ppap_capability_ops',
  'ppap.document_package': 'ppap_engineering_ops',
  'ppap.engineering_change': 'ppap_engineering_ops',
  'ppap.contextual_ppap_ai': 'ppap_cognitive_ops',
  'ppap.ppap_narrative': 'ppap_cognitive_ops'
});

const PPAP_HUB_MOUNT_REGISTRY = Object.freeze({
  submission_governance: 'SubmissionGovernanceHub',
  supplier_approval: 'SupplierApprovalHub',
  dimensional: 'DimensionalHub',
  capability: 'CapabilityHub',
  engineering: 'EngineeringHub',
  cognitive: 'CognitivePpapHub'
});

const CENTER_TO_HUB = Object.freeze({
  ppap_submission_governance: 'submission_governance',
  ppap_supplier_approval_ops: 'supplier_approval',
  ppap_dimensional_ops: 'dimensional',
  ppap_capability_ops: 'capability',
  ppap_engineering_ops: 'engineering',
  ppap_cognitive_ops: 'cognitive'
});

function buildPpapCenterCatalog() {
  return PPAP_CENTER_IDS.map((center_id) => ({
    center_id,
    label: center_id,
    hub_key: CENTER_TO_HUB[center_id] || null,
    hub_component: PPAP_HUB_MOUNT_REGISTRY[CENTER_TO_HUB[center_id]] || null,
    blocks: [],
    metrics: [],
    foundation_only: true,
    render_ready: false,
    mount_point_only: true
  }));
}

function buildPpapCentersFromShadow(shadow = {}, ppapPilot = {}) {
  const catalog = buildPpapCenterCatalog();
  const centerMap = new Map(catalog.map((c) => [c.center_id, { ...c, blocks: [], metrics: [] }]));
  const blocks = shadow.blocks || [];

  for (const block of blocks) {
    const blockId = block.block_id || block.id;
    const centerId = BLOCK_TO_CENTER[blockId];
    if (!centerId || !centerMap.has(centerId)) continue;
    const signals = block.shadow_signals || {};
    if (signals.binding_ok !== true && block.eligible !== true) continue;
    const center = centerMap.get(centerId);
    center.blocks.push(blockId);
    if (signals.metrics && Object.keys(signals.metrics).length) {
      center.metrics.push({ block_id: blockId, ...signals.metrics });
    }
    if (signals.summary) {
      center.summary = center.summary ? `${center.summary} · ${signals.summary}` : signals.summary;
    }
  }

  const bindingRatio = ppapPilot?.engine_bridge?.binding_ratio ?? 0;

  return [...centerMap.values()].map((c) => ({
    ...c,
    foundation_only: false,
    mount_point_only: true,
    render_ready: false,
    promotion_gf: 'GF-004',
    specialized: c.blocks.length > 0,
    binding_ratio: bindingRatio
  }));
}

/** @deprecated GF-001 catalog — use buildPpapCenterCatalog */
const PPAP_CENTER_CATALOG = buildPpapCenterCatalog();

module.exports = {
  PPAP_CENTER_IDS,
  PPAP_HUB_MOUNT_REGISTRY,
  CENTER_TO_HUB,
  BLOCK_TO_CENTER,
  PPAP_CENTER_CATALOG,
  buildPpapCenterCatalog,
  buildPpapCentersFromShadow
};
