'use strict';

const { LOGISTICS_BLOCK_ALIASES } = require('../../../registry/logisticsCognitiveBlockPack');

function _result(blockId, { engine_ok, binding_ok, dataset_used, signal_count, reason, metrics = {}, summary = null }) {
  return {
    block_id: blockId,
    engine_ok: engine_ok === true,
    binding_ok: binding_ok === true,
    dataset_used: dataset_used || null,
    signal_count: signal_count ?? 0,
    reason: reason || (binding_ok ? 'BOUND' : 'NOT_BOUND'),
    bridge_status: binding_ok ? 'bound_z20' : 'bound_empty',
    data_status: binding_ok ? 'engine_bound' : 'graceful_empty',
    metrics,
    summary,
    engine_invoked: true,
    assistive_only: true,
    render_active: false
  };
}

function bindInventoryHealth(bundle) {
  const ds = bundle.datasets?.warehouse_materials;
  const inv = bundle.inventory || {};
  const wmsCount = (inv.total_materials ?? 0) + (inv.balance_rows ?? 0);

  if (ds?.available && wmsCount > 0) {
    return _result('logistics.inventory_health', {
      engine_ok: true,
      binding_ok: true,
      dataset_used: 'warehouse_materials,warehouse_balances,warehouse_alerts',
      signal_count: wmsCount,
      reason: 'BOUND',
      metrics: {
        total_materials: inv.total_materials ?? 0,
        below_min_count: inv.below_min_count ?? 0,
        open_alerts: inv.open_alerts ?? 0,
        source: 'wms'
      },
      summary: `Materiais: ${inv.total_materials ?? 0} · abaixo mínimo: ${inv.below_min_count ?? 0}`
    });
  }

  const mp = bundle.cross_domain?.raw_material_inventory || {};
  if (mp.has_data && (mp.total_lots ?? 0) > 0) {
    return _result('logistics.inventory_health', {
      engine_ok: true,
      binding_ok: true,
      dataset_used: 'raw_material_lots',
      signal_count: mp.total_lots,
      reason: 'BOUND',
      metrics: {
        total_lots: mp.total_lots,
        active_lots: mp.active_lots ?? 0,
        blocked_lots: mp.blocked_lots ?? 0,
        materials_distinct: mp.materials_distinct ?? 0,
        source: 'raw_material_bridge'
      },
      summary: `Lotes MP: ${mp.total_lots} · materiais: ${mp.materials_distinct ?? 0}`
    });
  }

  if (!ds?.available) {
    return _result('logistics.inventory_health', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'warehouse_materials',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }

  return _result('logistics.inventory_health', {
    engine_ok: true,
    binding_ok: false,
    dataset_used: 'warehouse_materials,warehouse_balances,raw_material_lots',
    signal_count: 0,
    reason: 'NO_RECORDS'
  });
}

function bindStockRotation(bundle) {
  const ds = bundle.datasets?.warehouse_movements;
  if (!ds?.available) {
    return _result('logistics.stock_rotation', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'warehouse_movements',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const rot = bundle.rotation || {};
  if ((rot.movement_count_30d ?? 0) === 0) {
    return _result('logistics.stock_rotation', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'warehouse_movements',
      signal_count: 0,
      reason: 'NO_RECORDS'
    });
  }
  return _result('logistics.stock_rotation', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'warehouse_movements',
    signal_count: rot.movement_count_30d,
    reason: 'BOUND',
    metrics: {
      movement_count_30d: rot.movement_count_30d,
      materials_with_movement: rot.materials_with_movement ?? 0,
      idle_materials: rot.idle_materials ?? 0
    },
    summary: `Movimentações 30d: ${rot.movement_count_30d}`
  });
}

function bindWarehouseCapacity(bundle) {
  const ds = bundle.datasets?.warehouse_locations;
  if (!ds?.available) {
    return _result('logistics.warehouse_capacity', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'warehouse_locations',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  if ((ds.count ?? 0) === 0) {
    const foundation = bundle.datasets?.logistics_inventory;
    if (foundation?.available && (foundation.count ?? 0) > 0) {
      return _result('logistics.warehouse_capacity', {
        engine_ok: true,
        binding_ok: true,
        dataset_used: 'logistics_inventory',
        signal_count: foundation.count,
        reason: 'BOUND',
        metrics: { inventory_records: foundation.count },
        summary: `Registos foundation inventário: ${foundation.count}`
      });
    }
    return _result('logistics.warehouse_capacity', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'warehouse_locations',
      signal_count: 0,
      reason: 'NO_RECORDS'
    });
  }
  return _result('logistics.warehouse_capacity', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'warehouse_locations',
    signal_count: ds.count,
    reason: 'BOUND',
    metrics: { locations: ds.count },
    summary: `Localizações: ${ds.count}`
  });
}

function bindReceivingFlow(bundle) {
  const mov = bundle.datasets?.warehouse_movements;
  const rec = bundle.datasets?.logistics_receipts;
  const receiptsMp = bundle.datasets?.raw_material_receipts;
  const inbound = bundle.inbound || {};
  const qi = bundle.cross_domain?.quality_inspections || {};

  const wmsSignal =
    (inbound.entrada_movements_30d ?? 0) + (inbound.receipts_count ?? 0) + (receiptsMp?.count ?? 0);

  if (wmsSignal > 0) {
    const ds =
      inbound.receipts_count > 0
        ? 'logistics_receipts'
        : receiptsMp?.count > 0
          ? 'raw_material_receipts'
          : 'warehouse_movements';
    return _result('logistics.receiving_flow', {
      engine_ok: true,
      binding_ok: true,
      dataset_used: ds,
      signal_count: wmsSignal,
      reason: 'BOUND',
      metrics: {
        entrada_movements_30d: inbound.entrada_movements_30d ?? 0,
        receipts_count: inbound.receipts_count ?? 0,
        raw_material_receipts: receiptsMp?.count ?? 0,
        source: 'wms_foundation'
      },
      summary: `Recebimentos/mov. entrada: ${wmsSignal}`
    });
  }

  if (qi.has_data && (qi.inbound_inspections ?? 0) > 0) {
    return _result('logistics.receiving_flow', {
      engine_ok: true,
      binding_ok: true,
      dataset_used: 'quality_inspections',
      signal_count: qi.inbound_inspections,
      reason: 'BOUND',
      metrics: {
        inspections_total: qi.total_inspections ?? 0,
        distinct_lots: qi.distinct_lots ?? 0,
        source: 'quality_bridge'
      },
      summary: `Inspeções recebimento/MP: ${qi.inbound_inspections}`
    });
  }

  if (!mov?.available && !rec?.available && !receiptsMp?.available && !qi.has_data) {
    return _result('logistics.receiving_flow', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'warehouse_movements,logistics_receipts,raw_material_receipts,quality_inspections',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }

  return _result('logistics.receiving_flow', {
    engine_ok: true,
    binding_ok: false,
    dataset_used: 'warehouse_movements,logistics_receipts,raw_material_receipts,quality_inspections',
    signal_count: 0,
    reason: 'NO_RECORDS'
  });
}

function bindPickingEfficiency() {
  return _result('logistics.picking_efficiency', {
    engine_ok: false,
    binding_ok: false,
    dataset_used: null,
    signal_count: 0,
    reason: 'NOT_IMPLEMENTED'
  });
}

function bindDockFlow(bundle) {
  const ds = bundle.datasets?.logistics_points_dock;
  const dock = bundle.dock || {};
  if (!ds?.available) {
    return _result('logistics.dock_flow', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'logistics_points',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = (dock.dock_points ?? 0) + (dock.expeditions_at_dock ?? 0);
  if (count === 0) {
    return _result('logistics.dock_flow', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'logistics_points',
      signal_count: 0,
      reason: 'NO_RECORDS'
    });
  }
  return _result('logistics.dock_flow', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'logistics_points,logistics_expeditions',
    signal_count: count,
    reason: 'BOUND',
    metrics: { dock_points: dock.dock_points ?? 0, open_expeditions: dock.expeditions_at_dock ?? 0 },
    summary: `Docas: ${dock.dock_points ?? 0}`
  });
}

function bindShipmentOtif(bundle) {
  const ds = bundle.datasets?.logistics_expeditions;
  const ship = bundle.datasets?.logistics_shipments;
  const out = bundle.outbound || {};
  if (!ds?.available && !ship?.available) {
    return _result('logistics.shipment_otif', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'logistics_expeditions,logistics_shipments',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const total = out.deliveries_total ?? 0;
  if (total === 0 && (out.shipments_count ?? 0) === 0) {
    return _result('logistics.shipment_otif', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'logistics_expeditions,logistics_shipments',
      signal_count: 0,
      reason: 'NO_RECORDS'
    });
  }
  return _result('logistics.shipment_otif', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: total > 0 ? 'logistics_expeditions' : 'logistics_shipments',
    signal_count: total || out.shipments_count,
    reason: 'BOUND',
    metrics: {
      deliveries_total: out.deliveries_total ?? 0,
      on_time_rate_pct: out.on_time_rate_pct,
      delayed_count: out.deliveries_delayed ?? 0
    },
    summary:
      out.on_time_rate_pct != null
        ? `OTIF: ${out.on_time_rate_pct}% (${out.deliveries_total ?? 0} entregas)`
        : `Expedições: ${total || out.shipments_count}`
  });
}

function bindFleetEfficiency(bundle) {
  const ds = bundle.datasets?.logistics_vehicles;
  const fleet = bundle.fleet || {};
  if (!ds?.available) {
    return _result('logistics.fleet_efficiency', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'logistics_vehicles',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  if ((fleet.vehicles_total ?? 0) === 0) {
    return _result('logistics.fleet_efficiency', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'logistics_vehicles',
      signal_count: 0,
      reason: 'NO_RECORDS'
    });
  }
  return _result('logistics.fleet_efficiency', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'logistics_vehicles,logistics_telemetry',
    signal_count: fleet.vehicles_total,
    reason: 'BOUND',
    metrics: {
      vehicles_total: fleet.vehicles_total,
      vehicles_in_use: fleet.vehicles_in_use ?? 0,
      utilization_pct: fleet.utilization_pct
    },
    summary: `Frota: ${fleet.vehicles_total} · utilização ${fleet.utilization_pct ?? '—'}%`
  });
}

function bindRoutePerformance(bundle) {
  const routes = bundle.datasets?.logistics_routes;
  const route = bundle.routes || {};
  if (!routes?.available) {
    return _result('logistics.route_performance', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'logistics_routes',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = (route.routes_total ?? 0) + (route.expeditions_with_route ?? 0);
  if (count === 0) {
    return _result('logistics.route_performance', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'logistics_routes',
      signal_count: 0,
      reason: 'NO_RECORDS'
    });
  }
  return _result('logistics.route_performance', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'logistics_routes,logistics_expeditions',
    signal_count: count,
    reason: 'BOUND',
    metrics: {
      routes_total: route.routes_total ?? 0,
      avg_route_time_minutes: route.avg_route_time_minutes
    },
    summary: `Rotas: ${route.routes_total ?? 0}`
  });
}

function bindSupplierDelivery(bundle) {
  const cross = bundle.cross_domain?.supplier_delivery || {};
  if (cross.has_data && (cross.delivery_signals ?? 0) > 0) {
    return _result('logistics.supplier_delivery', {
      engine_ok: true,
      binding_ok: true,
      dataset_used: (cross.source_tables || []).join(','),
      signal_count: cross.delivery_signals,
      reason: 'BOUND',
      metrics: {
        suppliers_with_data: cross.suppliers_with_data ?? 0,
        source_tables: cross.source_tables || []
      },
      summary: `Fornecedores/entregas: ${cross.delivery_signals}`
    });
  }

  const ds = bundle.datasets?.warehouse_suppliers;
  const sup = bundle.suppliers || {};
  if (!ds?.available) {
    return _result('logistics.supplier_delivery', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'warehouse_suppliers,raw_material_lots,raw_material_receipts,supplier_quality_metrics',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  if ((sup.suppliers_total ?? 0) === 0) {
    return _result('logistics.supplier_delivery', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'warehouse_suppliers,raw_material_lots,raw_material_receipts,supplier_quality_metrics',
      signal_count: 0,
      reason: 'NO_RECORDS'
    });
  }
  return _result('logistics.supplier_delivery', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'warehouse_suppliers',
    signal_count: sup.suppliers_total,
    reason: 'BOUND',
    metrics: { suppliers_total: sup.suppliers_total },
    summary: `Fornecedores: ${sup.suppliers_total}`
  });
}

function bindTraceabilityBridge(bundle) {
  const lots = bundle.datasets?.raw_material_lots;
  const track = bundle.datasets?.logistics_lot_tracking;
  const tr = bundle.traceability || {};
  const qi = bundle.cross_domain?.quality_inspections || {};

  if (!lots?.available && !track?.available && !qi.has_data) {
    return _result('logistics.traceability_bridge', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'raw_material_lots,logistics_lot_tracking,quality_inspections',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }

  const rawCount = tr.raw_lots ?? lots?.count ?? 0;
  const logisticsCount = tr.logistics_lots ?? track?.count ?? 0;
  const inspectionLots = qi.distinct_lots ?? 0;
  const count = rawCount + logisticsCount + inspectionLots;

  if (count === 0) {
    return _result('logistics.traceability_bridge', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'raw_material_lots,logistics_lot_tracking,quality_inspections',
      signal_count: 0,
      reason: 'NO_RECORDS'
    });
  }

  const used = [];
  if (rawCount > 0) used.push('raw_material_lots');
  if (logisticsCount > 0) used.push('logistics_lot_tracking');
  if (inspectionLots > 0) used.push('quality_inspections');

  return _result('logistics.traceability_bridge', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: used.join(','),
    signal_count: count,
    reason: 'BOUND',
    metrics: {
      raw_lots: rawCount,
      logistics_lots: logisticsCount,
      inspection_lots: inspectionLots
    },
    summary: `Lotes rastreados: ${count} (MP ${rawCount} · inspeções ${inspectionLots})`
  });
}

function bindContextualLogisticsAi(bundle, priorBindings = []) {
  const boundCount = priorBindings.filter((b) => b.binding_ok).length;
  if (boundCount < 2) {
    return _result('logistics.contextual_logistics_ai', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'aggregated_logistics_signals',
      signal_count: boundCount,
      reason: 'INSUFFICIENT_DATA'
    });
  }
  return _result('logistics.contextual_logistics_ai', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'aggregated_logistics_signals',
    signal_count: boundCount,
    reason: 'BOUND',
    metrics: { domains_with_data: boundCount },
    summary: `Sinais operacionais agregados: ${boundCount} blocos`
  });
}

function bindLogisticsNarrative(bundle, priorBindings = []) {
  const summaries = priorBindings.filter((b) => b.binding_ok && b.summary).map((b) => b.summary);
  if (summaries.length === 0) {
    return _result('logistics.logistics_narrative', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'bound_block_summaries',
      signal_count: 0,
      reason: 'INSUFFICIENT_DATA'
    });
  }
  return _result('logistics.logistics_narrative', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'bound_block_summaries',
    signal_count: summaries.length,
    reason: 'BOUND',
    metrics: { facts_used: summaries.length },
    summary: summaries.slice(0, 3).join(' · ')
  });
}

const PRIMARY_BINDERS = {
  'logistics.inventory_health': bindInventoryHealth,
  'logistics.stock_rotation': bindStockRotation,
  'logistics.warehouse_capacity': bindWarehouseCapacity,
  'logistics.receiving_flow': bindReceivingFlow,
  'logistics.picking_efficiency': bindPickingEfficiency,
  'logistics.dock_flow': bindDockFlow,
  'logistics.shipment_otif': bindShipmentOtif,
  'logistics.fleet_efficiency': bindFleetEfficiency,
  'logistics.route_performance': bindRoutePerformance,
  'logistics.supplier_delivery': bindSupplierDelivery,
  'logistics.traceability_bridge': bindTraceabilityBridge
};

function invokeLogisticsBlockBridge(blockId, signalBundle = {}, ctx = {}) {
  const canonical = LOGISTICS_BLOCK_ALIASES[blockId] || blockId;
  if (canonical === 'logistics.contextual_logistics_ai') {
    return bindContextualLogisticsAi(signalBundle, ctx._prior_bindings || []);
  }
  if (canonical === 'logistics.logistics_narrative') {
    return bindLogisticsNarrative(signalBundle, ctx._prior_bindings || []);
  }
  const fn = PRIMARY_BINDERS[canonical];
  if (!fn) {
    return _result(canonical, {
      engine_ok: false,
      binding_ok: false,
      dataset_used: null,
      signal_count: 0,
      reason: 'NOT_BOUND'
    });
  }
  return fn(signalBundle);
}

module.exports = {
  invokeLogisticsBlockBridge,
  PRIMARY_BINDERS
};
