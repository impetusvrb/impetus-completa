/**
 * GF-018 — Registries ishikawa_native + lazy hubs.
 */
import { lazy } from 'react';

export const ISHIKAWA_RUNTIME_ID = 'ishikawa_native';

/** @type {Record<string, string>} center_id → hub_key */
export const ISHIKAWA_CENTER_REGISTRY = Object.freeze({
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

/** @type {Record<string, { label: string, component: string, ready: boolean }>} */
export const ISHIKAWA_HUB_REGISTRY = Object.freeze({
  investigation_overview: {
    label: 'Investigation Overview',
    component: 'InvestigationOverviewHub',
    ready: true
  },
  fishbone: { label: 'Fishbone', component: 'FishboneHub', ready: true },
  five_why: { label: 'Five Why', component: 'FiveWhyHub', ready: true },
  corrective_actions: {
    label: 'Corrective Actions',
    component: 'CorrectiveActionsHub',
    ready: true
  },
  preventive_actions: {
    label: 'Preventive Actions',
    component: 'PreventiveActionsHub',
    ready: true
  },
  evidence: { label: 'Evidence', component: 'EvidenceHub', ready: true },
  approvals: { label: 'Approvals', component: 'ApprovalsHub', ready: true },
  recurrence: { label: 'Recurrence', component: 'RecurrenceHub', ready: true },
  organizational_learning: {
    label: 'Organizational Learning',
    component: 'OrganizationalLearningHub',
    ready: true
  },
  narrative: { label: 'Narrative', component: 'NarrativeHub', ready: true }
});

export const ISHIKAWA_HUB_COMPONENTS = Object.freeze({
  investigation_overview: lazy(() =>
    import('../../domains/ishikawa/cockpit/ishikawaHubs.jsx').then((m) => ({ default: m.InvestigationOverviewHub }))
  ),
  fishbone: lazy(() =>
    import('../../domains/ishikawa/cockpit/ishikawaHubs.jsx').then((m) => ({ default: m.FishboneHub }))
  ),
  five_why: lazy(() =>
    import('../../domains/ishikawa/cockpit/ishikawaHubs.jsx').then((m) => ({ default: m.FiveWhyHub }))
  ),
  corrective_actions: lazy(() =>
    import('../../domains/ishikawa/cockpit/ishikawaHubs.jsx').then((m) => ({ default: m.CorrectiveActionsHub }))
  ),
  preventive_actions: lazy(() =>
    import('../../domains/ishikawa/cockpit/ishikawaHubs.jsx').then((m) => ({ default: m.PreventiveActionsHub }))
  ),
  evidence: lazy(() =>
    import('../../domains/ishikawa/cockpit/ishikawaHubs.jsx').then((m) => ({ default: m.EvidenceHub }))
  ),
  approvals: lazy(() =>
    import('../../domains/ishikawa/cockpit/ishikawaHubs.jsx').then((m) => ({ default: m.ApprovalsHub }))
  ),
  recurrence: lazy(() =>
    import('../../domains/ishikawa/cockpit/ishikawaHubs.jsx').then((m) => ({ default: m.RecurrenceHub }))
  ),
  organizational_learning: lazy(() =>
    import('../../domains/ishikawa/cockpit/ishikawaHubs.jsx').then((m) => ({ default: m.OrganizationalLearningHub }))
  ),
  narrative: lazy(() =>
    import('../../domains/ishikawa/cockpit/ishikawaHubs.jsx').then((m) => ({ default: m.NarrativeHub }))
  )
});

export const ISHIKAWA_RUNTIME_REGISTRY = Object.freeze({
  runtime_id: ISHIKAWA_RUNTIME_ID,
  runtime_name: ISHIKAWA_RUNTIME_ID,
  cockpit_mode: ISHIKAWA_RUNTIME_ID,
  foundation_gf: 'GF-015',
  promotion_gf: 'GF-018',
  inactive: true,
  centers: ISHIKAWA_CENTER_REGISTRY,
  hubs: ISHIKAWA_HUB_REGISTRY
});

export const ISHIKAWA_PROMOTION_REGISTRY = Object.freeze({
  runtime_id: ISHIKAWA_RUNTIME_ID,
  promotion_active: false,
  render_active: false,
  component: 'IshikawaNativeCockpitPromotion'
});

export const ISHIKAWA_DASHBOARD_REGISTRY = Object.freeze({
  runtime: ISHIKAWA_RUNTIME_REGISTRY,
  promotion: ISHIKAWA_PROMOTION_REGISTRY,
  promotion_active: false,
  consolidation_active: false
});

export const ISHIKAWA_PLACEHOLDER_WIDGET_IDS = Object.freeze([]);

export function resolvePromotedIshikawaHubs(centers = []) {
  const order = Object.keys(ISHIKAWA_HUB_REGISTRY);
  const bucket = new Map();
  for (const c of centers || []) {
    const hubKey = ISHIKAWA_CENTER_REGISTRY[c?.center_id];
    if (!hubKey) continue;
    if (!bucket.has(hubKey)) {
      const meta = ISHIKAWA_HUB_REGISTRY[hubKey] || {};
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

export function resolveAllIshikawaHubsForPromotion(centers = []) {
  return Object.keys(ISHIKAWA_HUB_REGISTRY).map((hubKey) => {
    const meta = ISHIKAWA_HUB_REGISTRY[hubKey];
    const centerIds = (centers || [])
      .filter((c) => ISHIKAWA_CENTER_REGISTRY[c?.center_id] === hubKey)
      .map((c) => c.center_id);
    return {
      hubKey,
      label: meta.label,
      component: meta.component,
      centerIds
    };
  });
}

export function shouldSuppressIshikawaPlaceholderWidgets(runtime) {
  return runtime?.consolidation_applied === true && runtime?.cockpit_mode === ISHIKAWA_RUNTIME_ID;
}

export default ISHIKAWA_RUNTIME_REGISTRY;
