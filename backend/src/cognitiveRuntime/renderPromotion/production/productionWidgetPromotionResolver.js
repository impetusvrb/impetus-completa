'use strict';

const SLOT_MAP = {
  'production.oee_contextual': 'kpi_cards',
  'production.throughput_monitor': 'grafico_tendencia',
  'production.bottleneck_heatmap': 'grafico_tendencia',
  'production.downtime_analysis': 'alertas',
  'production.scrap_intelligence': 'alertas',
  'production.telemetry_center': 'insights_ia',
  'production.operational_ai': 'insights_ia',
  'production.production_narrative': 'insights_ia'
};

function resolvePromotedProductionWidgetsFromShadow(shadow = {}, opts = {}) {
  const max = opts.max_widgets ?? 8;
  const blocks = shadow.blocks || [];
  const widgets = [];
  for (const b of blocks) {
    const slot = SLOT_MAP[b.block_id] || 'kpi_cards';
    if (!widgets.find((w) => w.id === slot)) {
      widgets.push({
        id: slot,
        render_promoted: true,
        source_block: b.block_id,
        cockpit_mode: 'production_native'
      });
    }
    if (widgets.length >= max) break;
  }
  if (!widgets.length) {
    widgets.push({ id: 'kpi_cards', render_promoted: true, cockpit_mode: 'production_native' });
  }
  return widgets;
}

module.exports = { resolvePromotedProductionWidgetsFromShadow };
