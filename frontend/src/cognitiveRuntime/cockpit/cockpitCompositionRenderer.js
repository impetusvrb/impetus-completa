/**
 * Z.23 — Enriquece widgets com metadata de centros cognitivos (sem novo layout)
 */

export function attachCognitiveCentersToWidgets(widgets = [], centers = []) {
  if (!Array.isArray(widgets) || !centers.length) return widgets;
  const bySlot = new Map();
  for (const c of centers) {
    if (c.render_slot) bySlot.set(c.render_slot, c);
  }
  return widgets.map((w) => {
    const center = bySlot.get(w.id);
    if (!center) return w;
    return {
      ...w,
      raw: {
        ...(w.raw || {}),
        cognitive_center_id: center.center_id,
        cognitive_center_metrics: center.metrics,
        cognitive_center_summary: center.summary,
        cognitive_layer: center.layer
      }
    };
  });
}

export default attachCognitiveCentersToWidgets;
