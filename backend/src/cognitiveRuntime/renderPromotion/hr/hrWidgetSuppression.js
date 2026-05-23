'use strict';

const { GENERIC_WIDGET_IDS, buildSuppressionPlan } = require('../quality/qualityWidgetSuppression');

const HR_EXTRA_GENERIC = Object.freeze([
  'grafico_producao_demanda',
  'diagrama_industrial',
  'manutencao',
  'energia',
  'estoque',
  'logistica'
]);

const HR_GENERIC_WIDGET_IDS = Object.freeze([...GENERIC_WIDGET_IDS, ...HR_EXTRA_GENERIC]);

function buildHrSuppressionPlan(legacyWidgets = [], opts = {}) {
  const base = buildSuppressionPlan(legacyWidgets, { max_suppressed: opts.max_suppressed ?? 6 });
  const extraSet = new Set(HR_EXTRA_GENERIC);
  for (const w of legacyWidgets) {
    const id = String(w.id || w.widget_id || '');
    if (extraSet.has(id) && !base.suppressed_generic_ids.includes(id)) {
      base.suppressed_generic_ids.push(id);
      base.suppressed.push({
        id,
        render_suppressed: true,
        suppression_reason: 'z26_hr_industrial_generic',
        preserved_for_rollback: true
      });
      base.generic_suppressed_count += 1;
    }
  }
  return base;
}

module.exports = { HR_GENERIC_WIDGET_IDS, buildHrSuppressionPlan };
