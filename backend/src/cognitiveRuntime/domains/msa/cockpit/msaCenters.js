'use strict';

/**
 * GF-011 — Centers + hub mount points msa_native (estrutura promovida).
 */

const MSA_CENTER_IDS = Object.freeze([
  'msa_study_governance_ops',
  'msa_gauge_management_ops',
  'msa_variable_grr_ops',
  'msa_attribute_agreement_ops',
  'msa_calibration_ops',
  'msa_cognitive_ops'
]);

const BLOCK_TO_CENTER = Object.freeze({
  'msa.measurement_system_registry': 'msa_study_governance_ops',
  'msa.study_governance': 'msa_study_governance_ops',
  'msa.measurement_capability': 'msa_study_governance_ops',
  'msa.gauge_inventory': 'msa_gauge_management_ops',
  'msa.variable_grr': 'msa_variable_grr_ops',
  'msa.bias_analysis': 'msa_variable_grr_ops',
  'msa.linearity_analysis': 'msa_variable_grr_ops',
  'msa.stability_analysis': 'msa_variable_grr_ops',
  'msa.attribute_agreement': 'msa_attribute_agreement_ops',
  'msa.calibration_monitoring': 'msa_calibration_ops',
  'msa.contextual_msa_ai': 'msa_cognitive_ops',
  'msa.msa_narrative': 'msa_cognitive_ops'
});

const MSA_HUB_MOUNT_REGISTRY = Object.freeze({
  study_governance: 'StudyGovernanceHub',
  gauge_management: 'GaugeManagementHub',
  variable_grr: 'VariableGrrHub',
  attribute_agreement: 'AttributeAgreementHub',
  calibration: 'CalibrationHub',
  cognitive: 'CognitiveMsaHub'
});

const CENTER_TO_HUB = Object.freeze({
  msa_study_governance_ops: 'study_governance',
  msa_gauge_management_ops: 'gauge_management',
  msa_variable_grr_ops: 'variable_grr',
  msa_attribute_agreement_ops: 'attribute_agreement',
  msa_calibration_ops: 'calibration',
  msa_cognitive_ops: 'cognitive'
});

function buildMsaCenterCatalog() {
  return MSA_CENTER_IDS.map((center_id) => ({
    center_id,
    label: center_id,
    hub_key: CENTER_TO_HUB[center_id] || null,
    hub_component: MSA_HUB_MOUNT_REGISTRY[CENTER_TO_HUB[center_id]] || null,
    blocks: [],
    metrics: [],
    foundation_only: true,
    render_ready: false,
    mount_point_only: true
  }));
}

function buildMsaCentersFromShadow(shadow = {}, msaPilot = {}) {
  const catalog = buildMsaCenterCatalog();
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

  const bindingRatio = msaPilot?.engine_bridge?.binding_ratio ?? 0;

  return [...centerMap.values()].map((c) => ({
    ...c,
    foundation_only: false,
    mount_point_only: true,
    render_ready: false,
    promotion_gf: 'GF-011',
    specialized: c.blocks.length > 0,
    binding_ratio: bindingRatio
  }));
}

const MSA_CENTER_CATALOG = buildMsaCenterCatalog();

module.exports = {
  MSA_CENTER_IDS,
  MSA_HUB_MOUNT_REGISTRY,
  CENTER_TO_HUB,
  BLOCK_TO_CENTER,
  MSA_CENTER_CATALOG,
  buildMsaCenterCatalog,
  buildMsaCentersFromShadow
};
