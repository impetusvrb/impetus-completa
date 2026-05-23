'use strict';

const { GENERIC_WIDGET_IDS, buildSuppressionPlan } = require('../quality/qualityWidgetSuppression');

const ENV_EXTRA = Object.freeze(['indicadores_executivos', 'resumo_executivo', 'grafico_producao_demanda', 'production_shift', 'pulse_rh', 'oee']);
const ENVIRONMENTAL_GENERIC_WIDGET_IDS = Object.freeze([...GENERIC_WIDGET_IDS, ...ENV_EXTRA]);

function buildEnvironmentalSuppressionPlan(legacyWidgets = [], opts = {}) {
  const base = buildSuppressionPlan(legacyWidgets, { max_suppressed: opts.max_suppressed ?? 8 });
  const extraSet = new Set(ENV_EXTRA);
  for (const w of legacyWidgets) {
    const id = String(w.id || w.widget_id || '');
    if (extraSet.has(id) && !base.suppressed_generic_ids.includes(id)) {
      base.suppressed_generic_ids.push(id);
      base.suppressed.push({ id, render_suppressed: true, suppression_reason: 'p1env_generic', preserved_for_rollback: true });
      base.generic_suppressed_count += 1;
    }
  }
  return base;
}

module.exports = { ENVIRONMENTAL_GENERIC_WIDGET_IDS, buildEnvironmentalSuppressionPlan };
