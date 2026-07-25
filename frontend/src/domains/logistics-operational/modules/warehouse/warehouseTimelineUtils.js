const INBOUND = new Set(['receipt', 'putaway']);
const OUTBOUND = new Set(['issue', 'pick']);

function formatTs(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('pt-BR');
  } catch {
    return '—';
  }
}

export function classifyMovement(m) {
  const t = String(m.movement_type || '').toLowerCase();
  if (INBOUND.has(t)) return 'entrada';
  if (OUTBOUND.has(t)) return 'saida';
  return 'movimentacao';
}

export function filterMovementsByWarehouse(movements, warehouseId) {
  return movements.filter((m) => m.warehouse_id === warehouseId);
}

export function groupMovementsByType(movements, warehouseId) {
  const filtered = filterMovementsByWarehouse(movements, warehouseId);
  return {
    entradas: filtered.filter((m) => classifyMovement(m) === 'entrada'),
    saidas: filtered.filter((m) => classifyMovement(m) === 'saida'),
    movimentacoes: filtered.filter((m) => classifyMovement(m) === 'movimentacao'),
    all: filtered
  };
}

export function buildWarehouseOperationalTimeline({ detail, movements, warehouseId, limit = 20 }) {
  const events = [];

  if (detail?.created_at) {
    events.push({
      id: 'evt-created',
      ts: detail.created_at,
      label: `Criação do armazém · ${formatTs(detail.created_at)}`
    });
  }
  if (detail?.updated_at && detail.updated_at !== detail.created_at) {
    events.push({
      id: 'evt-updated',
      ts: detail.updated_at,
      label: `Última alteração registada · ${formatTs(detail.updated_at)}`
    });
  }

  for (const m of filterMovementsByWarehouse(movements, warehouseId)) {
    events.push({
      id: m.id,
      ts: m.created_at,
      label: `${classifyMovement(m).toUpperCase()} · ${m.movement_type} · ${m.quantity ?? '—'} ${m.uom || ''} · ${formatTs(m.created_at)}`
    });
  }

  return events
    .sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
    .slice(0, limit)
    .map(({ id, label }) => ({ id, label }));
}

export function computeOccupancy(capacity, locations = []) {
  const used = Number(capacity?.location_count ?? locations.length ?? 0);
  const total = Number(capacity?.capacity_units);
  const free = Number.isFinite(total) ? Math.max(0, total - used) : null;
  const pct = Number.isFinite(total) && total > 0 ? Math.round((used / total) * 100) : null;
  return { used, total: Number.isFinite(total) ? total : null, free, pct };
}
