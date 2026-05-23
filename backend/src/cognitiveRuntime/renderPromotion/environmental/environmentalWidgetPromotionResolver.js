'use strict';

const SLOT_MAP = {
  'environmental.emissions_monitor': 'kpi_cards',
  'environmental.esg_governance': 'insights_ia',
  'environmental.license_compliance': 'alertas',
  'environmental.regulatory_risk': 'grafico_tendencia',
  'environmental.waste_management': 'kpi_cards',
  'environmental.compliance_timeline': 'alertas',
  'environmental.environmental_alerts': 'alertas',
  'environmental.contextual_environmental_ai': 'insights_ia'
};

function resolvePromotedEnvironmentalWidgetsFromShadow(shadow = {}, opts = {}) {
  const max = opts.max_widgets ?? 8;
  const widgets = [];
  for (const b of shadow.blocks || []) {
    const slot = SLOT_MAP[b.block_id] || 'kpi_cards';
    if (!widgets.find((w) => w.id === slot)) {
      widgets.push({ id: slot, render_promoted: true, source_block: b.block_id, cockpit_mode: 'environmental_native' });
    }
    if (widgets.length >= max) break;
  }
  if (!widgets.length) widgets.push({ id: 'kpi_cards', render_promoted: true, cockpit_mode: 'environmental_native' });
  return widgets;
}

module.exports = { resolvePromotedEnvironmentalWidgetsFromShadow };
