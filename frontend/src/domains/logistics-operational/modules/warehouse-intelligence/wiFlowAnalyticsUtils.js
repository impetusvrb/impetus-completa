/** OPM-007 — Flow analytics (Receiving → Inventory → Transfer → Picking → Shipping). */
function stageMetrics(orders, completedStatuses) {
  const open = orders.filter((o) => !completedStatuses.includes(o.status)).length;
  const done = orders.length - open;
  const waits = orders.filter((o) => o.metadata?.sla_breach || o.metadata?.exception).length;
  return { total: orders.length, open, done, waits };
}

export function computeWiFlowAnalytics({
  receiving = [],
  movements = [],
  transfers = [],
  picking = [],
  shipping = []
}) {
  const stages = [
    { id: 'receiving', label: 'Receiving', ...stageMetrics(receiving, ['completed', 'cancelled']) },
    { id: 'inventory', label: 'Inventory', total: movements.length, open: movements.filter((m) => m.movement_type === 'receipt' && !m.posted).length, done: movements.filter((m) => m.movement_type === 'receipt').length, waits: 0 },
    { id: 'transfer', label: 'Transfer', ...stageMetrics(transfers, ['received', 'cancelled']) },
    { id: 'picking', label: 'Picking', ...stageMetrics(picking, ['completed', 'cancelled']) },
    { id: 'shipping', label: 'Shipping', ...stageMetrics(shipping, ['shipped', 'cancelled']) }
  ];

  const totalOpen = stages.reduce((s, st) => s + (st.open || 0), 0);
  const totalWaits = stages.reduce((s, st) => s + (st.waits || 0), 0);

  const leadTimes = [];
  for (const o of picking.filter((p) => p.status === 'completed' && p.metadata?.picking_started_at && p.updated_at)) {
    leadTimes.push(new Date(o.updated_at) - new Date(o.metadata.picking_started_at));
  }
  const avgLeadMs = leadTimes.length ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : null;

  return {
    stages,
    summary: {
      totalOpenQueues: totalOpen,
      totalWaits: totalWaits,
      avgPickingLeadMin: avgLeadMs != null ? Math.round(avgLeadMs / 60000) : null,
      flowIntegrity: 'read_only_correlation'
    }
  };
}
