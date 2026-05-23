'use strict';

function superviseProductionFallback(consolidated = {}, payload = {}) {
  if (consolidated.centers?.length) return consolidated;
  return {
    ...consolidated,
    fallback_active: true,
    centers: [
      {
        center_id: 'production_fallback',
        label: 'Produção — aguardar telemetria',
        layer: 'operational',
        weight: 1,
        render_slot: 'kpi_cards',
        metrics: {},
        summary: 'Estado vazio técnico — integrar MES/PLC ou registar turno',
        ok: false
      }
    ],
    widgets: payload.widgets_legacy || consolidated.widgets || []
  };
}

module.exports = { superviseProductionFallback };
