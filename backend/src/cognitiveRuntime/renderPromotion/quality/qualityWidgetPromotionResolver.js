'use strict';

/**
 * Mapeia blocos cognitivos quality → widgets Centro de Comando (IDs existentes).
 * Sem novos componentes React — apenas promoção de slots já registados.
 */
const BLOCK_TO_WIDGET = Object.freeze({
  'quality.nc_center': {
    widget_id: 'qualidade',
    label: 'Centro de Não Conformidades',
    width: 2,
    weight: 1,
    priority: 0
  },
  'quality.spc_monitor': {
    widget_id: 'grafico_tendencia',
    label: 'Monitor SPC',
    width: 2,
    weight: 0.92,
    priority: 1
  },
  'quality.capa_engine': {
    widget_id: 'insights_ia',
    label: 'Motor CAPA',
    width: 2,
    weight: 0.88,
    priority: 2
  },
  'quality.nonconformity_heatmap': {
    widget_id: 'rastreabilidade',
    label: 'Heatmap NC por setor',
    width: 2,
    weight: 0.85,
    priority: 3
  },
  'quality.recurrence_analysis': {
    widget_id: 'kpi_cards',
    label: 'Análise de recorrência',
    width: 2,
    weight: 0.82,
    priority: 4
  },
  'quality.audit_governance': {
    widget_id: 'alertas',
    label: 'Governança de auditorias',
    width: 2,
    weight: 0.8,
    priority: 5
  },
  'quality.contextual_quality_ai': {
    widget_id: 'pergunte_ia',
    label: 'Assistente Qualidade',
    width: 2,
    weight: 0.78,
    priority: 6
  },
  'quality.supplier_intelligence': {
    widget_id: 'receitas',
    label: 'Inteligência de fornecedores',
    width: 2,
    weight: 0.75,
    priority: 7
  },
  'quality.process_stability': {
    widget_id: 'grafico_tendencia',
    label: 'Estabilidade de processo',
    width: 1,
    weight: 0.7,
    priority: 8
  },
  'quality.quality_narrative': {
    widget_id: 'insights_ia',
    label: 'Narrativa executiva qualidade',
    width: 1,
    weight: 0.65,
    priority: 9
  }
});

const QUALITY_BASELINE_WIDGETS = Object.freeze([
  { widget_id: 'qualidade', label: 'Centro de Qualidade', width: 2, priority: 0 },
  { widget_id: 'kpi_cards', label: 'Indicadores de qualidade', width: 2, priority: 1 },
  { widget_id: 'rastreabilidade', label: 'Rastreabilidade', width: 2, priority: 2 },
  { widget_id: 'alertas', label: 'Alertas de qualidade', width: 2, priority: 3 },
  { widget_id: 'pergunte_ia', label: 'Assistente Qualidade', width: 2, priority: 4 },
  { widget_id: 'insights_ia', label: 'Insights IA Qualidade', width: 2, priority: 5 }
]);

function _pos(row, col, width = 1) {
  return { row, col, width };
}

function resolvePromotedWidgetsFromShadow(shadowCockpit = {}, opts = {}) {
  const maxWidgets = opts.max_widgets ?? 8;
  const blocks = (shadowCockpit.blocks || []).filter(
    (b) => b.enriched || b.shadow_signals?.bridge_status === 'bound_z20'
  );

  const resolved = [];
  const seenWidgetIds = new Set();

  const sorted = [...blocks].sort((a, b) => {
    const pa = BLOCK_TO_WIDGET[a.block_id]?.priority ?? 99;
    const pb = BLOCK_TO_WIDGET[b.block_id]?.priority ?? 99;
    return pa - pb;
  });

  for (const block of sorted) {
    const map = BLOCK_TO_WIDGET[block.block_id];
    if (!map) continue;
    if (seenWidgetIds.has(map.widget_id) && map.widget_id !== 'insights_ia') continue;

    const row = Math.floor(resolved.length / 2);
    const col = (resolved.length % 2) * 2;
    resolved.push({
      id: map.widget_id,
      widget_id: map.widget_id,
      label: map.label || block.label,
      position: _pos(row, col, map.width),
      render_active: true,
      render_promoted: true,
      cognitive_block_id: block.block_id,
      semantic_category: block.semantic_category,
      promotion_weight: map.weight,
      promotion_source: 'z22_quality_block',
      metrics: block.shadow_signals?.metrics || {},
      summary: block.shadow_signals?.summary || null
    });
    seenWidgetIds.add(map.widget_id);
    if (resolved.length >= maxWidgets) break;
  }

  if (resolved.length < 4) {
    for (const base of QUALITY_BASELINE_WIDGETS) {
      if (seenWidgetIds.has(base.widget_id)) continue;
      const row = Math.floor(resolved.length / 2);
      const col = (resolved.length % 2) * 2;
      resolved.push({
        id: base.widget_id,
        widget_id: base.widget_id,
        label: base.label,
        position: _pos(row, col, base.width),
        render_active: true,
        render_promoted: true,
        promotion_source: 'z22_quality_baseline',
        promotion_weight: 0.6
      });
      seenWidgetIds.add(base.widget_id);
      if (resolved.length >= maxWidgets) break;
    }
  }

  return resolved;
}

module.exports = {
  BLOCK_TO_WIDGET,
  QUALITY_BASELINE_WIDGETS,
  resolvePromotedWidgetsFromShadow
};
