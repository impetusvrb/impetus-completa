/**
 * Z.24 — Cockpit Composition Runtime (frontend).
 * Transforma blocos cognitivos do backend em slots de render para o dashboard.
 */

export function composeBlocksForRender(blocks = [], opts = {}) {
  const max = opts.maxVisible ?? 8;
  return blocks.slice(0, max).map((b, i) => ({
    block_id: b.block_id,
    label: b.label,
    semantic_layer: b.semantic_layer,
    priority: b.priority ?? i,
    weight: b.weight ?? 0.5,
    relevance: b.relevance ?? 0.5,
    render_slot: i
  }));
}

export function mapBlockToWidgetType(block) {
  if (!block) return 'generic_panel';
  const layer = block.semantic_layer || 'operational';
  if (layer === 'cognitive') return 'insight_panel';
  if (layer === 'strategic') return 'kpi_summary';
  if (layer === 'management' || layer === 'governance') return 'governance_panel';
  return 'operational_panel';
}
