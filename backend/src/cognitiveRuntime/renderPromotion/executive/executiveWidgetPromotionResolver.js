'use strict';

const EXECUTIVE_WIDGET_SLOTS = ['kpi_cards', 'grafico_tendencia', 'alertas', 'resumo_inteligente', 'assistente_ia'];

function resolvePromotedExecutiveWidgetsFromShadow(shadow = {}, opts = {}) {
  const max = opts.max_widgets ?? 7;
  const blocks = shadow.blocks || [];
  const widgets = [];
  for (const slot of EXECUTIVE_WIDGET_SLOTS) {
    if (widgets.length >= max) break;
    widgets.push({ id: slot, render_promoted: true, cockpit_mode: 'executive_boardroom' });
  }
  if (!widgets.length) widgets.push({ id: 'kpi_cards', render_promoted: true, cockpit_mode: 'executive_boardroom' });
  return widgets.slice(0, max);
}

module.exports = { resolvePromotedExecutiveWidgetsFromShadow, EXECUTIVE_WIDGET_SLOTS };
