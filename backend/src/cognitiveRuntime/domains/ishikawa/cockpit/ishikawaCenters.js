'use strict';

/**
 * GF-018 — Centers + hub mount points ishikawa_native (estrutura promovida).
 */

const ISHIKAWA_CENTER_IDS = Object.freeze([
  'ishikawa_investigation_overview_ops',
  'ishikawa_fishbone_ops',
  'ishikawa_five_why_ops',
  'ishikawa_corrective_actions_ops',
  'ishikawa_preventive_actions_ops',
  'ishikawa_evidence_ops',
  'ishikawa_approvals_ops',
  'ishikawa_recurrence_ops',
  'ishikawa_organizational_learning_ops',
  'ishikawa_narrative_ops'
]);

const BLOCK_TO_CENTER = Object.freeze({
  'ishikawa.investigation_registry': 'ishikawa_investigation_overview_ops',
  'ishikawa.root_cause_repository': 'ishikawa_investigation_overview_ops',
  'ishikawa.fishbone_analysis': 'ishikawa_fishbone_ops',
  'ishikawa.five_whys': 'ishikawa_five_why_ops',
  'ishikawa.corrective_actions': 'ishikawa_corrective_actions_ops',
  'ishikawa.preventive_actions': 'ishikawa_preventive_actions_ops',
  'ishikawa.evidence_repository': 'ishikawa_evidence_ops',
  'ishikawa.investigation_workflow': 'ishikawa_approvals_ops',
  'ishikawa.recurrence_monitor': 'ishikawa_recurrence_ops',
  'ishikawa.organizational_learning': 'ishikawa_organizational_learning_ops',
  'ishikawa.contextual_root_cause_ai': 'ishikawa_narrative_ops',
  'ishikawa.ishikawa_narrative': 'ishikawa_narrative_ops'
});

const ISHIKAWA_HUB_MOUNT_REGISTRY = Object.freeze({
  investigation_overview: 'InvestigationOverviewHub',
  fishbone: 'FishboneHub',
  five_why: 'FiveWhyHub',
  corrective_actions: 'CorrectiveActionsHub',
  preventive_actions: 'PreventiveActionsHub',
  evidence: 'EvidenceHub',
  approvals: 'ApprovalsHub',
  recurrence: 'RecurrenceHub',
  organizational_learning: 'OrganizationalLearningHub',
  narrative: 'NarrativeHub'
});

const CENTER_TO_HUB = Object.freeze({
  ishikawa_investigation_overview_ops: 'investigation_overview',
  ishikawa_fishbone_ops: 'fishbone',
  ishikawa_five_why_ops: 'five_why',
  ishikawa_corrective_actions_ops: 'corrective_actions',
  ishikawa_preventive_actions_ops: 'preventive_actions',
  ishikawa_evidence_ops: 'evidence',
  ishikawa_approvals_ops: 'approvals',
  ishikawa_recurrence_ops: 'recurrence',
  ishikawa_organizational_learning_ops: 'organizational_learning',
  ishikawa_narrative_ops: 'narrative'
});

const ISHIKAWA_CENTER_LABELS = Object.freeze({
  ishikawa_investigation_overview_ops: 'Investigation Overview',
  ishikawa_fishbone_ops: 'Fishbone',
  ishikawa_five_why_ops: 'Five Why',
  ishikawa_corrective_actions_ops: 'Corrective Actions',
  ishikawa_preventive_actions_ops: 'Preventive Actions',
  ishikawa_evidence_ops: 'Evidence',
  ishikawa_approvals_ops: 'Approvals',
  ishikawa_recurrence_ops: 'Recurrence',
  ishikawa_organizational_learning_ops: 'Organizational Learning',
  ishikawa_narrative_ops: 'Narrative'
});

function buildIshikawaCenterCatalog() {
  return ISHIKAWA_CENTER_IDS.map((center_id) => ({
    center_id,
    label: ISHIKAWA_CENTER_LABELS[center_id] || center_id,
    hub_key: CENTER_TO_HUB[center_id] || null,
    hub_component: ISHIKAWA_HUB_MOUNT_REGISTRY[CENTER_TO_HUB[center_id]] || null,
    blocks: [],
    metrics: [],
    foundation_only: true,
    render_ready: false,
    mount_point_only: true
  }));
}

function buildIshikawaCentersFromShadow(shadow = {}, ishikawaPilot = {}) {
  const catalog = buildIshikawaCenterCatalog();
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

  const bindingRatio = ishikawaPilot?.engine_bridge?.binding_ratio ?? 0;

  return [...centerMap.values()].map((c) => ({
    ...c,
    foundation_only: false,
    mount_point_only: true,
    render_ready: false,
    promotion_gf: 'GF-018',
    specialized: c.blocks.length > 0,
    binding_ratio: bindingRatio
  }));
}

const ISHIKAWA_CENTER_CATALOG = buildIshikawaCenterCatalog();

/** @deprecated use BLOCK_TO_CENTER */
const ISHIKAWA_CENTER_BLOCK_MAP = BLOCK_TO_CENTER;

module.exports = {
  ISHIKAWA_CENTER_IDS,
  ISHIKAWA_HUB_MOUNT_REGISTRY,
  CENTER_TO_HUB,
  BLOCK_TO_CENTER,
  ISHIKAWA_CENTER_LABELS,
  ISHIKAWA_CENTER_BLOCK_MAP,
  ISHIKAWA_CENTER_CATALOG,
  buildIshikawaCenterCatalog,
  buildIshikawaCentersFromShadow
};
