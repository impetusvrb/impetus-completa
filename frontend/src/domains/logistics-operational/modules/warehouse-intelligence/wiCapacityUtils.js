/** OPM-007 — Capacity analytics (projeção · saturação — informativo). */
export function computeWiCapacityAnalytics({ warehouses = [], balances = [], capacities = [] }) {
  const capMap = new Map(capacities.map((c) => [c.warehouse_id || c.id, c]));

  return warehouses.map((w) => {
    const cap = capMap.get(w.id) || {};
    const total = Number(cap.total_capacity ?? cap.capacity ?? 0);
    const used = Number(cap.used_capacity ?? 0);
    const stockQty = balances
      .filter((b) => b.warehouse_id === w.id)
      .reduce((s, b) => s + (Number(b.quantity_on_hand) || 0), 0);
    const usedEst = used || stockQty;
    const pct = total > 0 ? Math.round((usedEst / total) * 100) : null;
    const trend = pct != null && pct > 85 ? 'saturation_risk' : pct != null && pct < 30 ? 'underutilized' : 'stable';

    return {
      warehouse_id: w.id,
      warehouse: w.code || w.name || w.id,
      total_capacity: total || '—',
      used: usedEst,
      available: total ? Math.max(0, total - usedEst) : '—',
      occupancy_pct: pct,
      trend,
      critical: pct != null && pct >= 90,
      projection_note: pct != null && pct > 75 ? 'Tendência saturação — recomendação informativa' : null
    };
  });
}
