'use strict';

const BLOCK_TO_WIDGET = Object.freeze({
  'sst.incident_intelligence': { widget_id: 'alertas', label: 'Incidentes SST', width: 2, weight: 1, priority: 0 },
  'sst.permit_governance': { widget_id: 'alertas', label: 'APR/PT/LOTO', width: 2, weight: 0.95, priority: 1 },
  'sst.ppe_compliance': { widget_id: 'kpi_cards', label: 'EPI/EPC', width: 2, weight: 0.9, priority: 2 },
  'sst.hazard_heatmap': { widget_id: 'rastreabilidade', label: 'Heatmap Risco', width: 2, weight: 0.88, priority: 3 },
  'sst.field_occurrences': { widget_id: 'operacoes', label: 'Ocorrências Campo', width: 2, weight: 0.82, priority: 4 },
  'sst.risk_matrix': { widget_id: 'grafico_tendencia', label: 'Matriz Risco', width: 2, weight: 0.8, priority: 5 },
  'sst.safety_telemetry': { widget_id: 'grafico_tendencia', label: 'Telemetria SST', width: 2, weight: 0.78, priority: 6 },
  'sst.safety_narrative': { widget_id: 'insights_ia', label: 'Narrativa SST', width: 1, weight: 0.7, priority: 7 },
  'sst.safety_ai': { widget_id: 'pergunte_ia', label: 'IA SST', width: 2, weight: 0.75, priority: 8 }
});

const SAFETY_BASELINE = Object.freeze([
  { id: 'alertas', render_promoted: true, cognitive_source: 'sst_baseline' },
  { id: 'kpi_cards', render_promoted: true, cognitive_source: 'sst_baseline' }
]);

function resolvePromotedSafetyWidgetsFromShadow(shadow = {}, opts = {}) {
  const maxW = opts.max_widgets ?? 8;
  const blocks = shadow.blocks || [];
  const seen = new Set();
  const widgets = [];

  for (const block of blocks.sort((a, b) => {
    const pa = BLOCK_TO_WIDGET[a.block_id]?.priority ?? 99;
    const pb = BLOCK_TO_WIDGET[b.block_id]?.priority ?? 99;
    return pa - pb;
  })) {
    const map = BLOCK_TO_WIDGET[block.block_id];
    if (!map || seen.has(map.widget_id)) continue;
    seen.add(map.widget_id);
    widgets.push({
      id: map.widget_id,
      widget_id: map.widget_id,
      label: map.label,
      width: map.width,
      render_promoted: true,
      render_weight: map.weight,
      cognitive_block_id: block.block_id,
      promotion_phase: 'Z.25'
    });
    if (widgets.length >= maxW) break;
  }

  if (!widgets.length) return [...SAFETY_BASELINE];
  return widgets;
}

module.exports = { BLOCK_TO_WIDGET, resolvePromotedSafetyWidgetsFromShadow, SAFETY_BASELINE };
