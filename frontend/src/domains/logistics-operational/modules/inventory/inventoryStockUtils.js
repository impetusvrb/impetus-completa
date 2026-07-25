import { unavailableLabel } from './inventoryOperationalMessages.js';

function whLabel(map, id) {
  if (!id) return '—';
  const w = map.get(id);
  return w?.code || w?.name || String(id).slice(0, 8);
}

export function normalizeStockStatus(balance = {}) {
  const raw = String(balance.status || '').toLowerCase();
  if (raw.includes('quarantine') || raw.includes('quarentena')) return 'quarentena';
  if (raw.includes('block') || raw.includes('bloq')) return 'bloqueado';
  if (raw.includes('expir')) return 'expirado';
  if (Number(balance.reserved_quantity) > 0) return 'reservado';
  if (raw === 'inactive' || raw === 'hold') return 'bloqueado';
  return raw || 'disponível';
}

export function buildInventoryStockRows({ items = [], balances = [], warehouses = [] }) {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const whMap = new Map(warehouses.map((w) => [w.id, w]));

  if (balances.length) {
    return balances.map((b, idx) => {
      const item = itemMap.get(b.item_id) || {};
      const meta = item.metadata || b.metadata || {};
      return {
        id: b.id || `bal-${b.item_id}-${b.warehouse_id}-${idx}`,
        item_code: item.item_code || item.code || '—',
        sku: item.item_code || item.code || '',
        product: item.item_name || item.name || '—',
        description: item.description || meta.description || item.metadata?.description || '—',
        lot: b.lot_number || meta.lot_number || '—',
        serial: b.serial_number || meta.serial_number || (item.serial_controlled ? '—' : '—'),
        quantity: b.quantity ?? 0,
        uom: b.uom || item.uom || 'un',
        address: b.address_code || meta.address_code || (b.address_id ? String(b.address_id).slice(0, 8) : '—'),
        warehouse: whLabel(whMap, b.warehouse_id),
        warehouse_id: b.warehouse_id,
        status: normalizeStockStatus(b),
        last_movement_at: b.updated_at || b.last_movement_at || item.updated_at || null,
        reserved_quantity: Number(b.reserved_quantity) || 0,
        item_id: b.item_id,
        min_stock: Number(meta.min_stock ?? meta.reorder_point ?? item.min_stock) || null,
        _item: item,
        _balance: b
      };
    });
  }

  return items.map((item) => ({
    id: item.id,
    item_code: item.item_code || item.code || '—',
    sku: item.item_code || '',
    product: item.item_name || item.name || '—',
    description: item.description || item.metadata?.description || '—',
    lot: '—',
    serial: '—',
    quantity: 0,
    uom: item.uom || 'un',
    address: '—',
    warehouse: '—',
    status: 'sem_saldo',
    last_movement_at: item.updated_at || null,
    reserved_quantity: 0,
    item_id: item.id,
    min_stock: Number(item.metadata?.min_stock) || null,
    _item: item,
    _balance: null
  }));
}

export function indexLastMovementByItem(movements = []) {
  const map = new Map();
  for (const m of movements) {
    const id = m.item_id;
    if (!id) continue;
    const ts = m.created_at || m.posted_at;
    if (!ts) continue;
    const prev = map.get(id);
    if (!prev || new Date(ts) > new Date(prev)) map.set(id, ts);
  }
  return map;
}

export function enrichRowsWithLastMovement(rows, movements) {
  const idx = indexLastMovementByItem(movements);
  return rows.map((r) => ({
    ...r,
    last_movement_at: r.last_movement_at || idx.get(r.item_id) || null
  }));
}

export function parseMinStock(item, balance) {
  const meta = item?.metadata || balance?.metadata || {};
  const v = meta.min_stock ?? meta.reorder_point ?? item?.min_stock;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export { unavailableLabel };
