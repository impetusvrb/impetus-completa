'use strict';

/**
 * WMS-002 — Operational Compatibility Layer (OCL).
 * Única porta de entrada dos Core Services.
 */

const legacyAdapter = require('../adapters/warehouseLegacyAdapter');
const repos = require('../repositories');
const { withMeta } = require('./contracts/canonicalContracts');
const { resolveRoutingStrategy, snapshotRoutingPolicy } = require('./routingPolicy');
const { logOclResolution } = require('./oclObservability');

function _mapWmsRow(row, entity, source = 'wms') {
  if (!row) return null;
  const strategy = resolveRoutingStrategy(entity);
  const base = { ...row };
  if (row.code && !row.item_code) base.item_code = row.code;
  if (row.name && !row.item_name) base.item_name = row.name;
  return withMeta(base, source, strategy);
}

async function _timed(entity, fn) {
  const t0 = Date.now();
  const strategy = resolveRoutingStrategy(entity);
  try {
    const result = await fn(strategy);
    logOclResolution({
      entity,
      strategy,
      source: result?._source || strategy,
      adapter: strategy === 'legacy' || strategy === 'hybrid' ? legacyAdapter.ADAPTER_ID : 'wms_repository',
      durationMs: Date.now() - t0,
      fallback: result?._fallback
    });
    return result;
  } catch (err) {
    logOclResolution({
      entity,
      strategy,
      source: 'error',
      adapter: legacyAdapter.ADAPTER_ID,
      durationMs: Date.now() - t0,
      fallback: true
    });
    throw err;
  }
}

function _mergeByCode(wmsItems, legacyItems, codeKey = 'item_code') {
  const map = new Map();
  for (const it of wmsItems) map.set(String(it[codeKey] || it.code || it.id), it);
  for (const it of legacyItems) {
    const k = String(it[codeKey] || it.item_code || it.id);
    if (!map.has(k)) map.set(k, { ...it, _fallback: true });
  }
  return [...map.values()];
}

const ocl = {
  getRoutingPolicy: snapshotRoutingPolicy,

  warehouses: {
    async list(companyId, opts = {}) {
      return _timed('Warehouse', async (strategy) => {
        const wmsRows = await repos.warehouseRepository.list(companyId, opts);
        const wms = wmsRows.map((r) => _mapWmsRow(r, 'Warehouse'));
        if (strategy === 'wms') return { items: wms, strategy };
        if (strategy === 'legacy') {
          const locs = await legacyAdapter.listLocations(companyId, opts);
          const virtual = locs.length
            ? [
                withMeta(
                  { id: 'legacy-default', code: 'LEGACY-WH', name: 'Legacy Warehouse (aggregated)', warehouse_type: 'virtual' },
                  'legacy',
                  strategy
                )
              ]
            : [];
          return { items: virtual, strategy };
        }
        return { items: wms, strategy, legacy_locations_count: (await legacyAdapter.listLocations(companyId, { limit: 1 })).length };
      });
    },

    async create(companyId, data) {
      return _timed('Warehouse', async () => {
        const row = await repos.warehouseRepository.create(companyId, {
          code: data.code,
          name: data.name,
          warehouse_type: data.warehouse_type || 'standard',
          status: 'active',
          metadata: data.metadata || {}
        });
        return _mapWmsRow(row, 'Warehouse');
      });
    }
  },

  inventory: {
    async listItems(companyId, opts = {}) {
      return _timed('InventoryItem', async (strategy) => {
        const wmsRows = await repos.inventoryItemRepository.list(companyId, opts);
        const wms = wmsRows.map((r) => _mapWmsRow(r, 'InventoryItem'));
        if (strategy === 'wms') return { items: wms, strategy };
        const legacy = await legacyAdapter.listMaterials(companyId, opts);
        if (strategy === 'legacy') return { items: legacy, strategy };
        return { items: _mergeByCode(wms, legacy), strategy };
      });
    },

    async listBalances(companyId, opts = {}) {
      return _timed('InventoryBalance', async (strategy) => {
        const wmsRows = await repos.inventoryBalanceRepository.list(companyId, opts);
        const wms = wmsRows.map((r) => _mapWmsRow(r, 'InventoryBalance'));
        if (strategy === 'wms') return { items: wms, strategy };
        const legacy = await legacyAdapter.listLegacyBalances(companyId, opts);
        if (strategy === 'legacy') return { items: legacy, strategy };
        return { items: [...wms, ...legacy.filter((l) => !wms.some((w) => w.item_id === l.legacy_material_id))], strategy };
      });
    },

    async createItem(companyId, data) {
      return _timed('InventoryItem', async () => {
        const row = await repos.inventoryItemRepository.create(companyId, {
          item_code: data.item_code,
          item_name: data.item_name,
          uom: data.uom || 'un',
          item_class: data.item_class || null,
          lot_controlled: !!data.lot_controlled,
          metadata: data.metadata || {}
        });
        return _mapWmsRow(row, 'InventoryItem');
      });
    }
  },

  movements: {
    async create(companyId, data) {
      return _timed('InventoryMovement', async () => {
        const row = await repos.inventoryMovementRepository.create(companyId, {
          warehouse_id: data.warehouse_id,
          item_id: data.item_id,
          movement_type: data.movement_type,
          quantity: data.quantity,
          uom: data.uom || 'un',
          from_address_id: data.from_address_id || null,
          to_address_id: data.to_address_id || null,
          lot_number: data.lot_number || null,
          reference_type: data.reference_type || null,
          reference_id: data.reference_id || null,
          status: 'posted',
          metadata: data.metadata || {}
        });
        return _mapWmsRow(row, 'InventoryMovement');
      });
    },

    async list(companyId, opts = {}) {
      return _timed('InventoryMovement', async () => {
        const rows = await repos.inventoryMovementRepository.list(companyId, opts);
        return { items: rows.map((r) => _mapWmsRow(r, 'InventoryMovement')), strategy: 'wms' };
      });
    }
  },

  receiving: {
    async createOrder(companyId, data) {
      return _timed('ReceivingOrder', async () => {
        const row = await repos.receivingOrderRepository.create(companyId, {
          warehouse_id: data.warehouse_id,
          order_number: data.order_number,
          supplier_ref: data.supplier_ref || null,
          status: 'open',
          metadata: data.metadata || {}
        });
        return _mapWmsRow(row, 'ReceivingOrder');
      });
    },

    async list(companyId, opts = {}) {
      return _timed('ReceivingOrder', async () => {
        const rows = await repos.receivingOrderRepository.list(companyId, opts);
        return { items: rows.map((r) => _mapWmsRow(r, 'ReceivingOrder')), strategy: 'wms' };
      });
    }
  },

  picking: {
    async createOrder(companyId, data) {
      return _timed('PickingOrder', async () => {
        const row = await repos.pickingOrderRepository.create(companyId, {
          warehouse_id: data.warehouse_id,
          order_number: data.order_number,
          priority: data.priority ?? 5,
          status: 'open',
          metadata: data.metadata || {}
        });
        return _mapWmsRow(row, 'PickingOrder');
      });
    },

    async list(companyId, opts = {}) {
      return _timed('PickingOrder', async () => {
        const rows = await repos.pickingOrderRepository.list(companyId, opts);
        return { items: rows.map((r) => _mapWmsRow(r, 'PickingOrder')), strategy: 'wms' };
      });
    }
  },

  shipping: {
    async createOrder(companyId, data) {
      return _timed('ShippingOrder', async () => {
        const row = await repos.shippingOrderRepository.create(companyId, {
          warehouse_id: data.warehouse_id,
          order_number: data.order_number,
          carrier_ref: data.carrier_ref || null,
          status: 'open',
          metadata: data.metadata || {}
        });
        return _mapWmsRow(row, 'ShippingOrder');
      });
    },

    async list(companyId, opts = {}) {
      return _timed('ShippingOrder', async () => {
        const rows = await repos.shippingOrderRepository.list(companyId, opts);
        return { items: rows.map((r) => _mapWmsRow(r, 'ShippingOrder')), strategy: 'wms' };
      });
    }
  },

  transfers: {
    async createOrder(companyId, data) {
      return _timed('TransferOrder', async () => {
        const row = await repos.transferOrderRepository.create(companyId, {
          from_warehouse_id: data.from_warehouse_id,
          to_warehouse_id: data.to_warehouse_id,
          order_number: data.order_number,
          status: 'open',
          metadata: data.metadata || {}
        });
        return _mapWmsRow(row, 'TransferOrder');
      });
    },

    async list(companyId, opts = {}) {
      return _timed('TransferOrder', async () => {
        const rows = await repos.transferOrderRepository.list(companyId, opts);
        return { items: rows.map((r) => _mapWmsRow(r, 'TransferOrder')), strategy: 'wms' };
      });
    }
  },

  async getMigrationStats(companyId) {
    const [legacyCount, wmsItems, wmsWh] = await Promise.all([
      legacyAdapter.countLegacyMaterials(companyId),
      repos.inventoryItemRepository.list(companyId, { limit: 1000 }),
      repos.warehouseRepository.list(companyId, { limit: 100 })
    ]);
    const wmsCount = wmsItems.length;
    const total = legacyCount + wmsCount;
    const migratedPct = total === 0 ? 0 : Math.round((wmsCount / total) * 1000) / 10;
    return {
      legacy_materials: legacyCount,
      wms_items: wmsCount,
      wms_warehouses: wmsWh.length,
      migration_percent_wms_items: migratedPct
    };
  },

  /* WMS-003 complement — API surface only; routing/legacy logic unchanged above */

  warehousesApi: {
    async getById(companyId, id) {
      return _timed('Warehouse', async () => {
        const row = await repos.warehouseRepository.findById(companyId, id);
        if (!row) return null;
        return _mapWmsRow(row, 'Warehouse');
      });
    },

    async listLocations(companyId, warehouseId, opts = {}) {
      return _timed('WarehouseLocation', async () => {
        const rows = await repos.warehouseLocationRepository.list(companyId, opts);
        const filtered = warehouseId ? rows.filter((r) => r.warehouse_id === warehouseId) : rows;
        return {
          items: filtered.map((r) => _mapWmsRow(r, 'WarehouseLocation')),
          strategy: 'wms'
        };
      });
    },

    async getCapacity(companyId, warehouseId) {
      return _timed('Warehouse', async () => {
        const wh = await repos.warehouseRepository.findById(companyId, warehouseId);
        if (!wh) return null;
        const locs = await repos.warehouseLocationRepository.list(companyId, { limit: 5000 });
        const count = locs.filter((l) => l.warehouse_id === warehouseId).length;
        return withMeta(
          {
            warehouse_id: warehouseId,
            location_count: count,
            capacity_units: wh.metadata?.capacity_units ?? null,
            status: wh.status
          },
          'wms',
          'wms'
        );
      });
    }
  },

  inventoryApi: {
    async getItemById(companyId, id) {
      return _timed('InventoryItem', async () => {
        const row = await repos.inventoryItemRepository.findById(companyId, id);
        if (!row) return null;
        return _mapWmsRow(row, 'InventoryItem');
      });
    }
  },

  movementsApi: {
    async getById(companyId, id) {
      return _timed('InventoryMovement', async () => {
        const row = await repos.inventoryMovementRepository.findById(companyId, id);
        if (!row) return null;
        return _mapWmsRow(row, 'InventoryMovement');
      });
    }
  },

  receivingApi: {
    async getById(companyId, id) {
      return _timed('ReceivingOrder', async () => {
        const row = await repos.receivingOrderRepository.findById(companyId, id);
        if (!row) return null;
        return _mapWmsRow(row, 'ReceivingOrder');
      });
    },

    async updateStatus(companyId, id, status) {
      return _timed('ReceivingOrder', async () => {
        const row = await repos.receivingOrderRepository.update(companyId, id, { status });
        if (!row) return null;
        return _mapWmsRow(row, 'ReceivingOrder');
      });
    }
  },

  pickingApi: {
    async getById(companyId, id) {
      return _timed('PickingOrder', async () => {
        const row = await repos.pickingOrderRepository.findById(companyId, id);
        if (!row) return null;
        return _mapWmsRow(row, 'PickingOrder');
      });
    },

    async updateStatus(companyId, id, status) {
      return _timed('PickingOrder', async () => {
        const row = await repos.pickingOrderRepository.update(companyId, id, { status });
        if (!row) return null;
        return _mapWmsRow(row, 'PickingOrder');
      });
    },

    async execute(companyId, id) {
      return _timed('PickingOrder', async () => {
        const row = await repos.pickingOrderRepository.update(companyId, id, { status: 'picking' });
        if (!row) return null;
        return _mapWmsRow(row, 'PickingOrder');
      });
    },

    async complete(companyId, id) {
      return _timed('PickingOrder', async () => {
        const row = await repos.pickingOrderRepository.update(companyId, id, { status: 'completed' });
        if (!row) return null;
        return _mapWmsRow(row, 'PickingOrder');
      });
    }
  },

  shippingApi: {
    async getById(companyId, id) {
      return _timed('ShippingOrder', async () => {
        const row = await repos.shippingOrderRepository.findById(companyId, id);
        if (!row) return null;
        return _mapWmsRow(row, 'ShippingOrder');
      });
    },

    async dispatch(companyId, id) {
      return _timed('ShippingOrder', async () => {
        const row = await repos.shippingOrderRepository.update(companyId, id, { status: 'shipped' });
        if (!row) return null;
        return _mapWmsRow(row, 'ShippingOrder');
      });
    }
  },

  transfersApi: {
    async getById(companyId, id) {
      return _timed('TransferOrder', async () => {
        const row = await repos.transferOrderRepository.findById(companyId, id);
        if (!row) return null;
        return _mapWmsRow(row, 'TransferOrder');
      });
    },

    async complete(companyId, id) {
      return _timed('TransferOrder', async () => {
        const row = await repos.transferOrderRepository.update(companyId, id, { status: 'received' });
        if (!row) return null;
        return _mapWmsRow(row, 'TransferOrder');
      });
    }
  }
};

module.exports = ocl;
