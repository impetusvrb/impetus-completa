'use strict';

function resolvePromotedMaintenanceWidgetsFromShadow(shadow = {}, opts = {}) {
  const max = opts.max_widgets || 8;
  const blocks = shadow.blocks || [];
  const defaults = ['kpi_cards', 'alertas', 'trend', 'telemetry', 'assistente_ia', 'narrative'];
  const fromBlocks = blocks.map((b) => {
    const id = b.block_id || b.id || '';
    if (id.includes('narrative')) return { id: 'narrative', render_promoted: true };
    if (id.includes('ai')) return { id: 'assistente_ia', render_promoted: true };
    if (id.includes('telemetry')) return { id: 'telemetry', render_promoted: true };
    if (id.includes('alert')) return { id: 'alertas', render_promoted: true };
    if (id.includes('heatmap') || id.includes('downtime')) return { id: 'trend', render_promoted: true };
    return { id: 'kpi_cards', render_promoted: true };
  });
  const merged = fromBlocks.length ? fromBlocks : defaults.map((id) => ({ id, render_promoted: true }));
  const seen = new Set();
  return merged.filter((w) => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  }).slice(0, max);
}

module.exports = { resolvePromotedMaintenanceWidgetsFromShadow };
