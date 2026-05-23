'use strict';

const { GENERIC_WIDGET_IDS, buildSuppressionPlan } = require('../quality/qualityWidgetSuppression');

const PRODUCTION_EXTRA_GENERIC = Object.freeze([
  'indicadores_executivos',
  'centro_custos',
  'executive_summary',
  'resumo_executivo',
  'grafico_financeiro',
  'pulse_rh',
  'esg_board'
]);

const PRODUCTION_GENERIC_WIDGET_IDS = Object.freeze([...GENERIC_WIDGET_IDS, ...PRODUCTION_EXTRA_GENERIC]);

function buildProductionSuppressionPlan(legacyWidgets = [], opts = {}) {
  const base = buildSuppressionPlan(legacyWidgets, { max_suppressed: opts.max_suppressed ?? 8 });
  const extraSet = new Set(PRODUCTION_EXTRA_GENERIC);
  for (const w of legacyWidgets) {
    const id = String(w.id || w.widget_id || '');
    if (extraSet.has(id) && !base.suppressed_generic_ids.includes(id)) {
      base.suppressed_generic_ids.push(id);
      base.suppressed.push({
        id,
        render_suppressed: true,
        suppression_reason: 'zp0_production_generic',
        preserved_for_rollback: true
      });
      base.generic_suppressed_count += 1;
    }
  }
  return base;
}

module.exports = { PRODUCTION_GENERIC_WIDGET_IDS, buildProductionSuppressionPlan };
