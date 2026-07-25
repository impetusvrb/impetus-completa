import { unavailableLabel, parseMinStock } from './inventoryStockUtils.js';

const STALE_DAYS = 90;

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeInventoryKpis({ items = [], stockRows = [], movements = [], loadMeta = null }) {
  const uniqueItems = new Set(stockRows.map((r) => r.item_id).filter(Boolean));
  const totalItems = uniqueItems.size || items.length;

  let available = 0;
  let reserved = 0;
  let blocked = 0;
  let divergences = 0;
  let belowMin = 0;
  let critical = 0;
  let pendingCounts = 0;

  for (const row of stockRows) {
    const st = String(row.status || '').toLowerCase();
    if (st === 'disponível' || st === 'available') available += 1;
    if (st === 'reservado' || Number(row.reserved_quantity) > 0) reserved += 1;
    if (st === 'bloqueado' || st === 'quarentena' || st === 'expirado') blocked += 1;

    const min = row.min_stock ?? parseMinStock(row._item, row._balance);
    const qty = Number(row.quantity) || 0;
    if (min != null && qty < min) belowMin += 1;
    if (min != null && qty <= min * 0.5) critical += 1;
  }

  for (const m of movements) {
    const t = String(m.movement_type || '').toLowerCase();
    if (t.includes('adjust') || t.includes('ajuste') || m.status === 'divergence') divergences += 1;
    if (t.includes('count') && (m.status === 'pending' || m.status === 'open')) pendingCounts += 1;
  }

  const lastSync = loadMeta?.loaded_at
    ? new Date(loadMeta.loaded_at).toLocaleString('pt-BR')
    : unavailableLabel();

  return {
    items: [
      { id: 'total', label: 'Total de itens', value: totalItems, color: 'var(--cyan)' },
      { id: 'available', label: 'Itens disponíveis', value: available, color: 'var(--green)' },
      { id: 'reserved', label: 'Itens reservados', value: reserved, color: reserved > 0 ? 'var(--amber)' : 'var(--text-secondary)' },
      { id: 'blocked', label: 'Itens bloqueados', value: blocked, color: blocked > 0 ? 'var(--amber)' : 'var(--text-secondary)' },
      { id: 'divergences', label: 'Divergências', value: divergences, color: divergences > 0 ? 'var(--red)' : 'var(--green)' },
      { id: 'below_min', label: 'Estoque mínimo', value: belowMin, color: belowMin > 0 ? 'var(--amber)' : 'var(--text-secondary)' },
      { id: 'critical', label: 'Estoque crítico', value: critical, color: critical > 0 ? 'var(--red)' : 'var(--green)' },
      { id: 'pending', label: 'Inventários pendentes', value: pendingCounts, color: 'var(--cyan)' },
      { id: 'sync', label: 'Última sincronização', value: lastSync, color: 'var(--text-tertiary)' }
    ],
    partial: !stockRows.length && items.length > 0,
    gaps: !stockRows.length && items.length ? ['GAP-OPM-INV-001'] : []
  };
}

export function computeInventoryIntelligence({ stockRows = [], movements = [] }) {
  const cutoff = Date.now() - STALE_DAYS * 86400000;
  const movedItems = new Set();
  for (const m of movements) {
    const d = parseDate(m.created_at || m.posted_at);
    if (d && d.getTime() >= cutoff && m.item_id) movedItems.add(m.item_id);
  }

  const belowMin = [];
  const divergences = [];
  const noMovement = [];
  const critical = [];
  const stagnant = [];
  const ruptureTrend = [];

  for (const row of stockRows) {
    const min = row.min_stock ?? parseMinStock(row._item, row._balance);
    const qty = Number(row.quantity) || 0;
    if (min != null && qty < min) belowMin.push(row);
    if (min != null && qty <= min * 0.5) critical.push(row);
    if (row.item_id && !movedItems.has(row.item_id)) noMovement.push(row);
    const last = parseDate(row.last_movement_at);
    if (last && last.getTime() < cutoff) stagnant.push(row);
    if (min != null && qty > 0 && qty <= min * 1.1) ruptureTrend.push(row);
    if (String(row.status).includes('diverg')) divergences.push(row);
  }

  return {
    belowMin: belowMin.slice(0, 5),
    divergences: divergences.slice(0, 5),
    noMovement: noMovement.slice(0, 5),
    critical: critical.slice(0, 5),
    stagnant: stagnant.slice(0, 5),
    ruptureTrend: ruptureTrend.slice(0, 5),
    counts: {
      belowMin: belowMin.length,
      divergences: divergences.length,
      noMovement: noMovement.length,
      critical: critical.length,
      stagnant: stagnant.length,
      ruptureTrend: ruptureTrend.length
    }
  };
}
