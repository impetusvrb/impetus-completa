import { unavailableLabel } from './warehouseOperationalMessages.js';

const PERIOD_DAYS = 30;

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeWarehouseKpis({ warehouses = [], balances = [], movements = [], capacities = [] }) {
  const total = warehouses.length;

  let usedCapacity = 0;
  let totalCapacityUnits = 0;
  let hasCapacityData = false;
  let hasAvailableGap = false;

  for (const c of capacities) {
    if (!c) continue;
    const loc = Number(c.location_count);
    if (Number.isFinite(loc)) {
      usedCapacity += loc;
      hasCapacityData = true;
    }
    const units = Number(c.capacity_units);
    if (Number.isFinite(units)) {
      totalCapacityUnits += units;
    } else if (c.capacity_units == null) {
      hasAvailableGap = true;
    }
  }

  const itemIds = new Set();
  let qtySum = 0;
  for (const b of balances) {
    if (b.item_id) itemIds.add(b.item_id);
    const q = Number(b.quantity ?? b.qty ?? 0);
    if (Number.isFinite(q)) qtySum += q;
  }
  const storedItems = itemIds.size || (balances.length ? balances.length : 0);

  const cutoff = Date.now() - PERIOD_DAYS * 86400000;
  let periodMovements = 0;
  for (const m of movements) {
    const d = parseDate(m.created_at || m.posted_at);
    if (d && d.getTime() >= cutoff) periodMovements += 1;
  }

  let alerts = 0;
  for (const w of warehouses) {
    if (w.status === 'inactive' || w.status === 'maintenance') alerts += 1;
    if (w.active === false) alerts += 1;
  }

  const capacityUsedLabel = hasCapacityData ? usedCapacity : unavailableLabel();
  const capacityAvailableLabel =
    hasCapacityData && totalCapacityUnits > 0
      ? Math.max(0, totalCapacityUnits - usedCapacity)
      : hasAvailableGap || !hasCapacityData
        ? unavailableLabel()
        : unavailableLabel();

  return {
    items: [
      { id: 'total', label: 'Total armazéns', value: total, color: 'var(--cyan)' },
      { id: 'cap_used', label: 'Capacidade utilizada', value: capacityUsedLabel, color: 'var(--amber)' },
      { id: 'cap_avail', label: 'Capacidade disponível', value: capacityAvailableLabel, color: 'var(--green)' },
      { id: 'stored', label: 'Itens armazenados', value: storedItems, color: 'var(--text-secondary)' },
      { id: 'movements', label: `Movimentações (${PERIOD_DAYS}d)`, value: periodMovements, color: 'var(--cyan)' },
      { id: 'alerts', label: 'Alertas operacionais', value: alerts, color: alerts > 0 ? 'var(--red)' : 'var(--green)' }
    ],
    partial: !hasCapacityData || hasAvailableGap,
    gaps: hasAvailableGap ? ['GAP-OPM-WH-001'] : []
  };
}
