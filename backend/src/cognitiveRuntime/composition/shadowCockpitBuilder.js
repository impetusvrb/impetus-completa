'use strict';

const { extractDeliveredWidgetTypes } = require('./compositionContextBuilder');

const GENERIC_COCKPIT_PATTERNS =
  /operational_insights|department_interactions|recent_interactions|ai_insights|^trend$|live_metric|uptime|centro_operac|efficiencia|produção|production_total/i;

function snapshotGenericCockpit(payload = {}) {
  const cards = (payload.profile_config?.cards || []).map((c) => ({
    id: c.id || c.key,
    title: c.title || c.label,
    type: 'card',
    generic: isGenericItem(c.id || c.title)
  }));
  const widgets = (payload.profile_config?.widgets || []).map((w) => ({
    id: w.id || w.type,
    type: 'widget',
    generic: isGenericItem(w.id || w.type)
  }));
  const kpis = (payload.kpis || []).map((k) => ({
    id: k.id,
    label: k.label || k.title,
    type: 'kpi',
    generic: isGenericItem(k.label || k.title)
  }));
  const v2 = extractDeliveredWidgetTypes(payload).map((t) => ({
    id: t,
    type: 'engine_v2',
    generic: isGenericItem(t)
  }));

  const items = [...cards, ...widgets, ...kpis, ...v2].filter((i) => i.id);
  return {
    cockpit_type: 'legacy_generic',
    items,
    generic_items: items.filter((i) => i.generic),
    domain_specific_items: items.filter((i) => !i.generic),
    item_count: items.length,
    genericity_ratio: items.length ? items.filter((i) => i.generic).length / items.length : 1
  };
}

function isGenericItem(s) {
  return GENERIC_COCKPIT_PATTERNS.test(String(s || ''));
}

function buildShadowCockpitLayout(eligibleBlocks = []) {
  const operational = eligibleBlocks.filter((b) =>
    /nc_center|spc_monitor|nonconformity|process_stability|inspection/i.test(b.block_id)
  );
  const management = eligibleBlocks.filter((b) =>
    /capa|audit|supplier/i.test(b.block_id)
  );
  const cognitive = eligibleBlocks.filter((b) =>
    /contextual|recurrence|narrative/i.test(b.block_id)
  );

  return {
    primary_operational_row: operational.slice(0, 3).map((b) => b.block_id),
    management_row: management.slice(0, 2).map((b) => b.block_id),
    cognitive_row: cognitive.slice(0, 2).map((b) => b.block_id),
    narrative_slot:
      eligibleBlocks.find((b) => b.block_id === 'quality.quality_narrative')?.block_id ||
      cognitive.find((b) => b.block_id?.includes('narrative'))?.block_id ||
      null
  };
}

function buildShadowCockpitBlocks(eligibleBlocks = [], compositionCtx = {}) {
  return eligibleBlocks.map((entry) => {
    const block = require('../registry/cognitiveBlockRegistry').getBlockById(entry.block_id);
    return {
      block_id: entry.block_id,
      label: block?.label || entry.block_id,
      semantic_category: entry.semantic_category,
      surface: block?.surface || 'widget',
      semantic_layer: block?.semantic_layer,
      composition_role: block?.contract?.composition_role,
      data_binding: block?.contract?.data_binding,
      engine_bridge: block?.metadata?.engine_bridge || null,
      rank: entry.rank,
      relevance_score: entry.relevance_score,
      operational_weight: entry.operational_weight,
      shadow_signals: buildShadowSignals(block, compositionCtx),
      render_active: false
    };
  });
}

function buildShadowSignals(block, ctx = {}) {
  const signals = {
    data_status: 'shadow_placeholder',
    tenant_id: ctx.tenant_id || null,
    governance_locked: ctx.governance_locked === true
  };
  if (block?.metadata?.engine_bridge) {
    signals.engine_bridge_declared = block.metadata.engine_bridge;
    signals.bridge_status = 'not_invoked_z19';
  }
  return signals;
}

function buildShadowCockpit(compositionRun = {}, payload = {}, ctx = {}) {
  const eligible = compositionRun.composition_result?.eligible_blocks || [];
  const genericSnapshot = snapshotGenericCockpit(payload);
  const layout = buildShadowCockpitLayout(eligible);
  const blocks = buildShadowCockpitBlocks(eligible, compositionRun.composition_ctx || ctx);

  const personaFit =
    eligible.length > 0
      ? eligible.reduce((s, b) => s + (b.relevance_score || 0), 0) / eligible.length
      : 0;
  const opFocus = (compositionRun.operational_weighting?.operational || 0.7) * 10;

  return {
    phase: 'Z.19',
    mode: 'shadow_only',
    cockpit_id: 'quality_cognitive_pilot_v1',
    domain_axis: compositionRun.domain_axis || 'quality',
    profile_code: compositionRun.profile_code,
    delivery_mutation: false,
    legacy_cockpit_preserved: true,
    layout,
    blocks,
    block_count: blocks.length,
    composition_score: {
      operational_focus: Math.round(opFocus * 10) / 10,
      persona_fit: Math.round(personaFit * 1000) / 1000,
      blocks_composed: blocks.length
    },
    generic_cockpit_snapshot: genericSnapshot
  };
}

module.exports = {
  snapshotGenericCockpit,
  buildShadowCockpit,
  buildShadowCockpitLayout,
  buildShadowCockpitBlocks,
  isGenericItem
};
