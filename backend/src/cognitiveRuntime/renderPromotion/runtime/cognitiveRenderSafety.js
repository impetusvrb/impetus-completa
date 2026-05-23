'use strict';

const TERMINAL_FORBIDDEN_WIDGETS = Object.freeze([
  'indicadores_executivos',
  'centro_custos',
  'mapa_vazamentos',
  'executive_summary'
]);

function sanitizePromotedWidgets(widgets = [], ctx = {}) {
  const governanceLocked = ctx.governance_locked === true;
  let list = Array.isArray(widgets) ? [...widgets] : [];

  if (governanceLocked) {
    list = list.filter((w) => !TERMINAL_FORBIDDEN_WIDGETS.includes(String(w.id || w.widget_id || '')));
  }

  return list.map((w, idx) => ({
    ...w,
    id: w.id || w.widget_id,
    position: w.position || { row: Math.floor(idx / 2), col: (idx % 2) * 2, width: w.position?.width || 2 },
    render_active: w.render_active !== false,
    assistive_only: true,
    global_replace: false
  }));
}

module.exports = { sanitizePromotedWidgets, TERMINAL_FORBIDDEN_WIDGETS };
