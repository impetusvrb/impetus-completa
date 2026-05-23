'use strict';

/** Widgets industriais genéricos — supressão parcial controlada (não removidos do rollback). */
const GENERIC_WIDGET_IDS = Object.freeze([
  'resumo_executivo',
  'operacoes',
  'gargalos',
  'desperdicio',
  'centro_previsao',
  'indicadores_executivos',
  'diagrama_industrial',
  'performance',
  'centro_custos',
  'mapa_vazamentos',
  'grafico_producao_demanda',
  'grafico_custos_setor',
  'grafico_margem',
  'manutencao',
  'energia',
  'estoque',
  'logistica'
]);

const GENERIC_PROFILE_WIDGET_IDS = Object.freeze(['ai_insights', 'recent_interactions']);

function buildSuppressionPlan(legacyWidgets = [], opts = {}) {
  const maxSuppress = opts.max_suppressed ?? 4;
  const suppressed = [];
  const active = [];

  for (const w of legacyWidgets) {
    const id = String(w.id || w.widget_id || w.key || '');
    const isGeneric =
      GENERIC_WIDGET_IDS.includes(id) || GENERIC_PROFILE_WIDGET_IDS.includes(id);
    if (isGeneric && suppressed.length < maxSuppress) {
      suppressed.push({
        id,
        render_suppressed: true,
        suppression_reason: 'z22_generic_industrial',
        preserved_for_rollback: true
      });
    } else {
      active.push(w);
    }
  }

  return {
    suppressed_generic_ids: suppressed.map((s) => s.id),
    suppressed,
    active_legacy: active,
    generic_suppressed_count: suppressed.length
  };
}

function applySuppressionToWidgetList(widgets = [], suppressionPlan = {}) {
  const suppressedSet = new Set(suppressionPlan.suppressed_generic_ids || []);
  return (widgets || []).filter((w) => !suppressedSet.has(String(w.id || w.widget_id || '')));
}

module.exports = {
  GENERIC_WIDGET_IDS,
  GENERIC_PROFILE_WIDGET_IDS,
  buildSuppressionPlan,
  applySuppressionToWidgetList
};
