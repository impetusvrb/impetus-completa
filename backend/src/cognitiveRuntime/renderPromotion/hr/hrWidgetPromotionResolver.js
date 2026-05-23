'use strict';

const BLOCK_TO_WIDGET = Object.freeze({
  'hr.people_analytics': { widget_id: 'kpi_cards', label: 'People Analytics', width: 2, weight: 1, priority: 0 },
  'hr.turnover_heatmap': { widget_id: 'grafico_tendencia', label: 'Turnover', width: 2, weight: 0.92, priority: 1 },
  'hr.absenteeism_monitor': { widget_id: 'alertas', label: 'Absenteísmo', width: 2, weight: 0.9, priority: 2 },
  'hr.retention_risk': { widget_id: 'alertas', label: 'Retenção', width: 2, weight: 0.88, priority: 3 },
  'hr.workforce_health': { widget_id: 'grafico_tendencia', label: 'Saúde Organizacional', width: 2, weight: 0.85, priority: 4 },
  'hr.training_governance': { widget_id: 'insights_ia', label: 'Treinamentos', width: 2, weight: 0.82, priority: 5 },
  'hr.behavioral_insights': { widget_id: 'insights_ia', label: 'Comportamento', width: 1, weight: 0.78, priority: 6 },
  'hr.recruitment_pipeline': { widget_id: 'operacoes', label: 'Recrutamento', width: 2, weight: 0.75, priority: 7 },
  'hr.performance_distribution': { widget_id: 'kpi_cards', label: 'Performance', width: 1, weight: 0.72, priority: 8 },
  'hr.hr_narrative': { widget_id: 'insights_ia', label: 'Narrativa RH', width: 1, weight: 0.7, priority: 9 },
  'hr.contextual_hr_ai': { widget_id: 'pergunte_ia', label: 'IA RH', width: 2, weight: 0.8, priority: 10 }
});

const HR_BASELINE = Object.freeze([
  { id: 'kpi_cards', render_promoted: true, cognitive_source: 'hr_baseline' },
  { id: 'grafico_tendencia', render_promoted: true, cognitive_source: 'hr_baseline' }
]);

function resolvePromotedHrWidgetsFromShadow(shadow = {}, opts = {}) {
  const maxW = opts.max_widgets ?? 8;
  const blocks = shadow.blocks || [];
  const seen = new Set();
  const widgets = [];

  for (const block of [...blocks].sort((a, b) => {
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
      promotion_phase: 'Z.26'
    });
    if (widgets.length >= maxW) break;
  }

  return widgets.length ? widgets : [...HR_BASELINE];
}

module.exports = { BLOCK_TO_WIDGET, resolvePromotedHrWidgetsFromShadow, HR_BASELINE };
