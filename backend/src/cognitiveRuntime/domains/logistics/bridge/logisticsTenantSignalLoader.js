'use strict';

const db = require('../../../../db');
const { logLogisticsSignal } = require('./logisticsSignalLoaderLogger');
const {
  loadQualityInspectionBridge,
  loadRawMaterialInventoryBridge,
  loadSupplierDeliveryBridge
} = require('./logisticsCrossDomainSignals');

const MOVEMENT_DAYS = 30;

async function safeCount(table, companyId, extraWhere = '') {
  try {
    const where = extraWhere ? `company_id = $1 AND ${extraWhere}` : 'company_id = $1';
    const r = await db.query(`SELECT COUNT(*)::int AS c FROM ${table} WHERE ${where}`, [companyId]);
    return { available: true, table, count: r.rows[0]?.c ?? 0 };
  } catch (err) {
    const msg = err?.message || '';
    if (/does not exist|relation/.test(msg)) {
      return { available: false, table, count: 0, reason: 'NO_DATASET' };
    }
    return { available: false, table, count: 0, reason: 'QUERY_ERROR', error: msg };
  }
}

async function loadInventorySignals(companyId) {
  const [materials, balances, belowMin, alerts] = await Promise.all([
    safeCount('warehouse_materials', companyId, 'active = true'),
    safeCount('warehouse_balances', companyId),
    db
      .query(
        `SELECT COUNT(*)::int AS c FROM warehouse_materials m
         LEFT JOIN warehouse_balances b ON b.material_id = m.id AND b.company_id = m.company_id
         WHERE m.company_id = $1 AND m.active AND m.min_stock > 0
           AND COALESCE(b.quantity, 0) < m.min_stock`,
        [companyId]
      )
      .then((r) => r.rows[0]?.c ?? 0)
      .catch(() => 0),
    safeCount('warehouse_alerts', companyId, 'acknowledged = false')
  ]);

  return {
    inventory: {
      total_materials: materials.count,
      balance_rows: balances.count,
      below_min_count: belowMin,
      open_alerts: alerts.count
    }
  };
}

async function loadRotationSignals(companyId) {
  const since = new Date(Date.now() - MOVEMENT_DAYS * 24 * 60 * 60 * 1000).toISOString();
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS movements,
              COUNT(DISTINCT material_id)::int AS materials
       FROM warehouse_movements
       WHERE company_id = $1 AND created_at >= $2`,
      [companyId, since]
    );
    let idle = 0;
    try {
      const idleR = await db.query(
        `SELECT COUNT(*)::int AS c FROM warehouse_materials m
         LEFT JOIN warehouse_balances b ON b.material_id = m.id AND b.company_id = m.company_id
         WHERE m.company_id = $1 AND m.active AND COALESCE(b.quantity, 0) > 0
           AND (b.last_movement_at IS NULL OR b.last_movement_at < $2)`,
        [companyId, since]
      );
      idle = idleR.rows[0]?.c ?? 0;
    } catch (_) {
      idle = 0;
    }
    return {
      rotation: {
        movement_count_30d: r.rows[0]?.movements ?? 0,
        materials_with_movement: r.rows[0]?.materials ?? 0,
        idle_materials: idle
      }
    };
  } catch (err) {
    if (/does not exist|relation/.test(err?.message || '')) {
      return { rotation: { movement_count_30d: 0, materials_with_movement: 0, idle_materials: 0 } };
    }
    throw err;
  }
}

async function loadInboundSignals(companyId) {
  const since = new Date(Date.now() - MOVEMENT_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let entrada = 0;
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM warehouse_movements
       WHERE company_id = $1 AND created_at >= $2 AND movement_type = 'entrada'`,
      [companyId, since]
    );
    entrada = r.rows[0]?.c ?? 0;
  } catch (_) {
    entrada = 0;
  }
  const receipts = await safeCount('logistics_receipts', companyId);
  return {
    inbound: {
      entrada_movements_30d: entrada,
      receipts_count: receipts.count
    }
  };
}

async function loadOutboundSignals(companyId) {
  const since = new Date(Date.now() - MOVEMENT_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let outbound = {
    deliveries_total: 0,
    deliveries_on_time: 0,
    deliveries_delayed: 0,
    on_time_rate_pct: null,
    shipments_count: 0
  };
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS deliveries_total,
              COUNT(*) FILTER (
                WHERE status = 'entregue'
                  AND (actual_arrival_at <= estimated_arrival_at OR delay_minutes <= 0 OR delay_minutes IS NULL)
              )::int AS deliveries_on_time,
              COUNT(*) FILTER (
                WHERE status IN ('entregue','atraso_detectado','problema_logistico')
                  AND (delay_minutes > 0 OR actual_arrival_at > estimated_arrival_at)
              )::int AS deliveries_delayed
       FROM logistics_expeditions
       WHERE company_id = $1 AND created_at >= $2 AND departure_at IS NOT NULL`,
      [companyId, since]
    );
    const row = r.rows[0] || {};
    const total = row.deliveries_total ?? 0;
    const onTime = row.deliveries_on_time ?? 0;
    outbound = {
      deliveries_total: total,
      deliveries_on_time: onTime,
      deliveries_delayed: row.deliveries_delayed ?? 0,
      on_time_rate_pct: total > 0 ? Math.round((onTime / total) * 10000) / 100 : null,
      shipments_count: 0
    };
  } catch (_) {
    /* table may be empty */
  }
  const shipments = await safeCount('logistics_shipments', companyId);
  outbound.shipments_count = shipments.count;
  return { outbound };
}

async function loadFleetSignals(companyId) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'in_use' AND active)::int AS in_use
       FROM logistics_vehicles WHERE company_id = $1 AND active`,
      [companyId]
    );
    const total = r.rows[0]?.total ?? 0;
    const inUse = r.rows[0]?.in_use ?? 0;
    return {
      fleet: {
        vehicles_total: total,
        vehicles_in_use: inUse,
        utilization_pct: total > 0 ? Math.round((inUse / total) * 10000) / 100 : null
      }
    };
  } catch (err) {
    if (/does not exist|relation/.test(err?.message || '')) {
      return { fleet: { vehicles_total: 0, vehicles_in_use: 0, utilization_pct: null } };
    }
    throw err;
  }
}

async function loadRouteSignals(companyId) {
  const routes = await safeCount('logistics_routes', companyId, 'active = true');
  let expeditionsWithRoute = 0;
  let avgMinutes = null;
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c,
              AVG(EXTRACT(EPOCH FROM (COALESCE(actual_arrival_at, now()) - departure_at))/60)
                FILTER (WHERE departure_at IS NOT NULL) AS avg_min
       FROM logistics_expeditions
       WHERE company_id = $1 AND route_id IS NOT NULL`,
      [companyId]
    );
    expeditionsWithRoute = r.rows[0]?.c ?? 0;
    avgMinutes = r.rows[0]?.avg_min != null ? Math.round(parseFloat(r.rows[0].avg_min) * 100) / 100 : null;
  } catch (_) {
    expeditionsWithRoute = 0;
  }
  return {
    routes: {
      routes_total: routes.count,
      expeditions_with_route: expeditionsWithRoute,
      avg_route_time_minutes: avgMinutes
    }
  };
}

async function loadDockSignals(companyId) {
  let dockPoints = 0;
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM logistics_points
       WHERE company_id = $1 AND active AND point_type = 'doca'`,
      [companyId]
    );
    dockPoints = r.rows[0]?.c ?? 0;
  } catch (_) {
    dockPoints = 0;
  }
  let openExp = 0;
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM logistics_expeditions
       WHERE company_id = $1 AND status IN ('aguardando_expedicao','em_carregamento')`,
      [companyId]
    );
    openExp = r.rows[0]?.c ?? 0;
  } catch (_) {
    openExp = 0;
  }
  return { dock: { dock_points: dockPoints, expeditions_at_dock: openExp } };
}

async function loadTraceabilitySignals(companyId) {
  const rawLots = await safeCount('raw_material_lots', companyId);
  const logisticsLots = await safeCount('logistics_lot_tracking', companyId);
  return {
    traceability: {
      raw_lots: rawLots.count,
      logistics_lots: logisticsLots.count
    }
  };
}

async function loadSupplierSignals(companyId) {
  const suppliers = await safeCount('warehouse_suppliers', companyId, 'active = true');
  return { suppliers: { suppliers_total: suppliers.count } };
}

/**
 * Carrega sinais reais do tenant — WMS/TMS/foundation/traceability.
 * Fail-closed: nunca lança para o caller do dashboard.
 */
async function loadLogisticsTenantSignals(user = {}, ctx = {}) {
  if (ctx.mock_signals) return ctx.mock_signals;

  const companyId = user?.company_id || ctx.tenant_id;
  if (!companyId) {
    return {
      ok: false,
      reason: 'missing_company_id',
      signal_readiness: 'unavailable',
      data_sources: [],
      datasets: {},
      raw: {}
    };
  }

  try {
    logLogisticsSignal('LOAD_START', { tenant_id: companyId });

    const datasetEntries = await Promise.all([
      safeCount('quality_inspections', companyId),
      safeCount('supplier_quality_metrics', companyId),
      safeCount('warehouse_materials', companyId),
      safeCount('warehouse_balances', companyId),
      safeCount('warehouse_movements', companyId),
      safeCount('warehouse_material_categories', companyId),
      safeCount('warehouse_suppliers', companyId),
      safeCount('warehouse_locations', companyId),
      safeCount('warehouse_alerts', companyId),
      safeCount('warehouse_predictions', companyId),
      safeCount('logistics_vehicles', companyId),
      safeCount('logistics_drivers', companyId),
      safeCount('logistics_routes', companyId),
      safeCount('logistics_expeditions', companyId),
      safeCount('logistics_shipments', companyId),
      safeCount('logistics_receipts', companyId),
      safeCount('logistics_inventory', companyId),
      safeCount('logistics_lot_tracking', companyId),
      safeCount('logistics_telemetry', companyId),
      safeCount('raw_material_lots', companyId),
      safeCount('raw_material_receipts', companyId),
      safeCount('logistics_points', companyId, "point_type = 'doca'").then((r) => ({
        ...r,
        table: 'logistics_points_dock'
      }))
    ]);

    const datasets = {};
    const data_sources = [];
    for (const d of datasetEntries) {
      const key = d.table === 'logistics_points_dock' ? 'logistics_points_dock' : d.table;
      datasets[key] = d;
      if (d.available && d.count > 0) data_sources.push(key);
    }

    const [
      inventoryBlock,
      rotationBlock,
      inboundBlock,
      outboundBlock,
      fleetBlock,
      routeBlock,
      dockBlock,
      traceBlock,
      supplierBlock,
      qualityBridge,
      rawMaterialBridge,
      supplierBridge
    ] = await Promise.all([
      loadInventorySignals(companyId),
      loadRotationSignals(companyId),
      loadInboundSignals(companyId),
      loadOutboundSignals(companyId),
      loadFleetSignals(companyId),
      loadRouteSignals(companyId),
      loadDockSignals(companyId),
      loadTraceabilitySignals(companyId),
      loadSupplierSignals(companyId),
      loadQualityInspectionBridge(companyId),
      loadRawMaterialInventoryBridge(companyId),
      loadSupplierDeliveryBridge(companyId)
    ]);

    if (qualityBridge.has_data) {
      data_sources.push('quality_inspections_bridge');
    }
    if (rawMaterialBridge.has_data && !data_sources.includes('raw_material_lots')) {
      data_sources.push('raw_material_lots');
    }
    for (const st of supplierBridge.source_tables || []) {
      if (!data_sources.includes(st)) data_sources.push(st);
    }

    const signal_readiness =
      data_sources.length >= 3 ? 'ready' : data_sources.length > 0 ? 'partial' : 'empty';

    logLogisticsSignal('LOAD_COMPLETE', {
      tenant_id: companyId,
      signal_readiness,
      data_sources: data_sources.length
    });

    return {
      ok: true,
      company_id: companyId,
      loaded_at: new Date().toISOString(),
      foundation_only: false,
      signal_readiness,
      signal_degradation: signal_readiness === 'empty' ? 'no_tenant_data' : 'none',
      data_sources,
      datasets,
      ...inventoryBlock,
      ...rotationBlock,
      ...inboundBlock,
      ...outboundBlock,
      ...fleetBlock,
      ...routeBlock,
      ...dockBlock,
      ...traceBlock,
      ...supplierBlock,
      cross_domain: {
        quality_inspections: qualityBridge,
        raw_material_inventory: rawMaterialBridge,
        supplier_delivery: supplierBridge
      },
      raw: {
        dataset_counts: Object.fromEntries(Object.entries(datasets).map(([k, v]) => [k, v.count]))
      }
    };
  } catch (err) {
    logLogisticsSignal('LOAD_ERROR', { tenant_id: companyId, error: err?.message });
    return {
      ok: false,
      reason: 'signal_load_error',
      signal_readiness: 'error',
      error_message: err?.message,
      data_sources: [],
      datasets: {},
      raw: {}
    };
  }
}

module.exports = { loadLogisticsTenantSignals, safeCount };
