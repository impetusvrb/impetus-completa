/** OPM-004 — Rotas de separação (visualização · optimização IA futura). */
import { trackPickingRouteViewed } from './pickingObservability.js';

export function buildRouteView(order) {
  if (!order) return null;
  const meta = order.metadata || order._order?.metadata || {};
  const stops = meta.route_stops || [];
  const completed = meta.route_completed_stops || 0;
  const total = stops.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  return {
    orderId: order.id || order._order?.id,
    orderNumber: order.order_number,
    zone: meta.zone || meta.route_zone || '—',
    distanceM: meta.route_distance_m ?? null,
    progress,
    stops: stops.map((s, i) => ({
      seq: s.sequence ?? i + 1,
      address: s.address_code || s.address || '—',
      item: s.item_code || s.item_id?.slice(0, 8) || '—',
      qty: s.qty ?? s.quantity ?? '—',
      done: s.done === true || i < completed
    }))
  };
}

export function buildActiveRoutes(rows = []) {
  return rows
    .filter((r) => r.operational_status === 'picking' || r.operational_status === 'released')
    .map((r) => buildRouteView(r))
    .filter(Boolean);
}

export function viewRoute(row) {
  const view = buildRouteView(row);
  if (view?.orderId) trackPickingRouteViewed(view.orderId);
  return view;
}
