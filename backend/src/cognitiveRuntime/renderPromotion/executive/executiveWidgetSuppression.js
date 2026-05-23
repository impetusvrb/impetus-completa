'use strict';

const EXECUTIVE_GENERIC_WIDGET_IDS = ['operational_insights', 'department_interactions', 'recent_interactions', 'indicadores_executivos'];

function buildExecutiveSuppressionPlan(legacyWidgets = []) {
  const suppress = new Set(EXECUTIVE_GENERIC_WIDGET_IDS);
  for (const w of legacyWidgets) {
    const id = String(w?.id || w || '').toLowerCase();
    if (/manutencao|quality_dashboard|apr|loto|emiss/i.test(id)) suppress.add(id);
  }
  return { suppressed_ids: [...suppress], operational_widgets_blocked: true };
}

module.exports = { buildExecutiveSuppressionPlan, EXECUTIVE_GENERIC_WIDGET_IDS };
