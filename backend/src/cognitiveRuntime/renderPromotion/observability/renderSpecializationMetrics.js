'use strict';

function computeRenderSpecializationMetrics(beforeWidgets = [], afterWidgets = []) {
  const beforeIds = new Set((beforeWidgets || []).map((w) => String(w.id || w.widget_id || '')));
  const promoted = (afterWidgets || []).filter((w) => w.render_promoted === true);
  const genericBefore = [...beforeIds].filter((id) =>
    /resumo_executivo|operacoes|gargalos|centro_previsao|indicadores_executivos/i.test(id)
  ).length;

  return {
    widget_count_before: beforeWidgets.length,
    widget_count_after: afterWidgets.length,
    promoted_widget_count: promoted.length,
    generic_widgets_before: genericBefore,
    genericity_reduction_render:
      beforeWidgets.length > 0
        ? Math.round((1 - genericBefore / Math.max(beforeWidgets.length, 1)) * 1000) / 1000
        : 0,
    specialized_render_ratio:
      afterWidgets.length > 0
        ? Math.round((promoted.length / afterWidgets.length) * 1000) / 1000
        : 0
  };
}

module.exports = { computeRenderSpecializationMetrics };
