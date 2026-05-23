'use strict';

const { GENERIC_WIDGET_IDS, buildSuppressionPlan, applySuppressionToWidgetList } = require('../quality/qualityWidgetSuppression');

const SAFETY_EXTRA_GENERIC = Object.freeze([
  'grafico_producao_demanda',
  'diagrama_industrial',
  'centro_previsao',
  'mapa_vazamentos'
]);

function buildSafetySuppressionPlan(legacyWidgets = [], opts = {}) {
  const base = buildSuppressionPlan(legacyWidgets, { max_suppressed: opts.max_suppressed ?? 6 });
  const extraSet = new Set(SAFETY_EXTRA_GENERIC);
  for (const w of legacyWidgets) {
    const id = String(w.id || w.widget_id || '');
    if (extraSet.has(id) && !base.suppressed_generic_ids.includes(id)) {
      base.suppressed_generic_ids.push(id);
      base.suppressed.push({
        id,
        render_suppressed: true,
        suppression_reason: 'z25_safety_industrial_generic',
        preserved_for_rollback: true
      });
      base.generic_suppressed_count += 1;
    }
  }
  return base;
}

const SAFETY_GENERIC_WIDGET_IDS = Object.freeze([...GENERIC_WIDGET_IDS, ...SAFETY_EXTRA_GENERIC]);

module.exports = {
  SAFETY_GENERIC_WIDGET_IDS,
  buildSafetySuppressionPlan,
  applySuppressionToWidgetList
};
