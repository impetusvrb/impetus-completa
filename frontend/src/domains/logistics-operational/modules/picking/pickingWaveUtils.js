/** OPM-004 — Ondas de separação (visualização operacional). */
import { PICKING_WAVE_TYPES } from './pickingListUtils.js';

export function buildPickingWaves(orders = []) {
  const waves = new Map();

  for (const order of orders) {
    const meta = order.metadata || {};
    const waveId = meta.wave_id || `single-${order.id}`;
    const waveType = meta.wave_type || 'individual';
    if (!waves.has(waveId)) {
      waves.set(waveId, {
        id: waveId,
        type: waveType,
        typeLabel: PICKING_WAVE_TYPES.find((t) => t.id === waveType)?.label || waveType,
        orders: [],
        pending: 0,
        picking: 0,
        completed: 0
      });
    }
    const w = waves.get(waveId);
    w.orders.push(order);
    if (order.status === 'completed') w.completed += 1;
    else if (order.status === 'picking') w.picking += 1;
    else w.pending += 1;
  }

  return [...waves.values()].sort((a, b) => b.orders.length - a.orders.length);
}

export function listWaveFilterOptions(waves = []) {
  return waves.map((w) => ({ id: w.id, label: `${w.id} (${w.orders.length})` }));
}
