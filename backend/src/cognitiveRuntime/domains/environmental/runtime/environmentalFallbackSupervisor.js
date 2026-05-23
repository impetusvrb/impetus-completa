'use strict';

function superviseEnvironmentalFallback(consolidated = {}, payload = {}) {
  if (consolidated.centers?.length) return consolidated;
  return {
    ...consolidated,
    fallback_active: true,
    centers: [{ center_id: 'environmental_fallback', label: 'Ambiental — aguardar dados', layer: 'governance', weight: 1, render_slot: 'kpi_cards', summary: 'Estado vazio técnico', ok: false }],
    widgets: payload.widgets_legacy || consolidated.widgets || []
  };
}

module.exports = { superviseEnvironmentalFallback };
