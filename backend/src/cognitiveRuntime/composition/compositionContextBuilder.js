'use strict';

const { resolveHierarchyTier } = require('../registry/cognitiveBlockAuthority');

function buildCompositionContext(user = {}, payload = {}, ctx = {}) {
  const profileCode = payload.profile_code || ctx.profile_code || user?.dashboard_profile || '';
  const functionalArea =
    payload.functional_area ||
    payload.functional_axis ||
    ctx.domain_axis ||
    user?.functional_area ||
    '';
  const domainAxis = String(functionalArea).toLowerCase().replace(/^coordinator_/, '');

  let canonical = {};
  try {
    const idGov = require('../../operationalIdentityGovernance/operationalIdentityGovernanceFacade');
    const ci = idGov.resolveGovernedIdentityForUser(user, {
      profile_code: profileCode,
      visible_modules: payload.visible_modules
    });
    canonical = ci.canonical_identity || {};
  } catch {
    canonical = payload.sidebar_governance_runtime?.canonical_identity || {};
  }

  const hierarchyTier = resolveHierarchyTier({
    profile_code: profileCode,
    hierarchy_tier: canonical.hierarchy_tier || ctx.hierarchy_tier,
    hierarchy_level: canonical.hierarchy_level ?? ctx.hierarchy_level,
    canonical_identity: canonical
  });

  return {
    tenant_id: user?.company_id || ctx.tenant_id,
    user_id: user?.id,
    profile_code: profileCode,
    functional_area: functionalArea,
    domain_axis: domainAxis || canonical.domain_axis || 'quality',
    hierarchy_tier: hierarchyTier,
    hierarchy_level: canonical.hierarchy_level,
    governance_locked:
      payload.governance_freeze_state?.governance_locked === true ||
      payload.sidebar_governance_runtime?.final_governance_locked === true,
    terminal_locked: payload.terminal_governance?.applied === true,
    final_visible_modules:
      payload.sidebar_governance_runtime?.final_visible_modules ||
      payload.visible_modules ||
      [],
    denied_publications: payload.sidebar_governance_runtime?.denied_publications || [],
    contextual_modules_mode: payload.contextual_modules_mode || 'STRICT',
    real_enforcement_active: ctx.real_enforcement_active === true,
    delivered_kpi_labels: (payload.kpis || []).map((k) => k.label || k.title || k.id),
    delivered_widget_types: extractDeliveredWidgetTypes(payload),
    registry_phase: 'Z.18',
    composition_mode: 'shadow_only'
  };
}

function extractDeliveredWidgetTypes(payload = {}) {
  const types = [];
  const cards = payload.profile_config?.cards || payload.cards || [];
  for (const c of cards) {
    if (c?.id) types.push(String(c.id));
    if (c?.type) types.push(String(c.type));
  }
  const widgets = payload.profile_config?.widgets || payload.widgets || [];
  for (const w of widgets) {
    if (w?.id) types.push(String(w.id));
    if (w?.type) types.push(String(w.type));
  }
  const v2 = payload.engine_v2?.payload?.layout?.widgets || [];
  for (const w of v2) {
    types.push(String(w.type || w.id || w.widget_id || ''));
  }
  return types.filter(Boolean);
}

module.exports = {
  buildCompositionContext,
  extractDeliveredWidgetTypes
};
