/**
 * INC-042 — Adapter de apresentação: runtime logistics_native → hubs CC.
 * Apenas leitura do payload /dashboard/me; sem lógica de negócio.
 */

/** @typedef {'REAL_DATA'|'INSUFFICIENT_DATA'|'NOT_IMPLEMENTED'} LogisticsHubDataState */

export const LOGISTICS_HUB_BLOCK_IDS = Object.freeze({
  warehouse_governance: ['logistics.inventory_health', 'logistics.warehouse_capacity'],
  inventory_cognitive: ['logistics.stock_rotation'],
  telemetry: ['logistics.dock_flow'],
  fleet: ['logistics.fleet_efficiency', 'logistics.route_performance'],
  distribution: ['logistics.shipment_otif', 'logistics.picking_efficiency'],
  supplier: ['logistics.receiving_flow', 'logistics.supplier_delivery', 'logistics.traceability_bridge'],
  cognitive: ['logistics.contextual_logistics_ai', 'logistics.logistics_narrative']
});

/** Rotas canónicas (manifesto LOGISTICS_NAVIGATION_MANIFEST). */
export const LOGISTICS_HUB_ROUTES = Object.freeze({
  warehouse_governance: '/app/logistics/operational?view=governance',
  inventory_cognitive: '/app/logistics/operational?view=storage',
  telemetry: '/app/logistics/operational?view=telemetry',
  fleet: '/app/logistics/operational?view=governance',
  distribution: '/app/logistics/operational?view=shipping',
  supplier: '/app/logistics/operational?view=receiving',
  cognitive: '/app/logistics/operational?view=maturity'
});

const NOT_IMPLEMENTED_REASONS = new Set(['NOT_IMPLEMENTED', 'NO_DATASET']);

/**
 * @param {string} hubKey
 * @param {{ centers?: object[], runtime?: object, signalLoader?: object }} ctx
 */
export function resolveLogisticsHubView(hubKey, ctx = {}) {
  const blockIds = LOGISTICS_HUB_BLOCK_IDS[hubKey] || [];
  const details = ctx.signalLoader?.block_details || [];
  const boundBlocks = ctx.signalLoader?.bound_blocks || [];
  const blockMap = new Map(details.map((d) => [d.block_id, d]));

  const related = blockIds.map((id) => ({
    block_id: id,
    detail: blockMap.get(id),
    bound: boundBlocks.includes(id)
  }));

  const hasNotImplemented = related.some(
    (r) => r.detail && NOT_IMPLEMENTED_REASONS.has(r.detail.reason)
  );
  if (hasNotImplemented && related.every((r) => !r.bound)) {
    return buildView(hubKey, 'NOT_IMPLEMENTED', related, ctx);
  }

  const bound = related.filter((r) => r.bound);
  if (bound.length > 0) {
    return buildView(hubKey, 'REAL_DATA', related, ctx, bound);
  }

  return buildView(hubKey, 'INSUFFICIENT_DATA', related, ctx);
}

function buildView(hubKey, state, related, ctx, bound = []) {
  const metrics = [];
  for (const r of bound.length ? bound : related) {
    const d = r.detail;
    if (!d) continue;
    if (d.summary) metrics.push({ label: r.block_id.replace('logistics.', ''), value: d.summary });
    else if (d.signal_count != null) {
      metrics.push({ label: r.block_id.replace('logistics.', ''), value: String(d.signal_count) });
    }
  }

  const centerIds = (ctx.centers || [])
    .filter((c) => {
      const blocks = c.blocks || [];
      return blocks.some((b) => (LOGISTICS_HUB_BLOCK_IDS[hubKey] || []).includes(b));
    })
    .map((c) => c.center_id);

  return {
    hubKey,
    state,
    metrics,
    binding_ratio: ctx.runtime?.binding_ratio ?? ctx.signalLoader?.binding_ratio ?? null,
    route: LOGISTICS_HUB_ROUTES[hubKey] || '/app/logistics/operational',
    related_blocks: related.map((r) => ({
      block_id: r.block_id,
      reason: r.detail?.reason || (r.bound ? 'BOUND' : 'UNKNOWN')
    })),
    center_ids: centerIds
  };
}

/**
 * @param {object} meData
 */
export function buildLogisticsHubContext(meData = {}) {
  return {
    centers: meData.logistics_cognitive_centers || meData.logistics_cognitive_runtime?.centers || [],
    runtime: meData.logistics_cognitive_runtime || meData.logistics_runtime || null,
    signalLoader: meData.logistics_signal_loader || null
  };
}

export function isLogisticsNativeCockpitActive(meData = {}) {
  const rt = meData.logistics_cognitive_runtime || meData.logistics_runtime;
  return rt?.consolidation_applied === true && rt?.cockpit_mode === 'logistics_native';
}
