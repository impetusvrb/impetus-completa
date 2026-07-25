'use strict';

const {
  SUPPLY_PERMISSIONS,
  SUPPLY_RBAC_PROFILES,
  hasSupplyPermission
} = require('../../domains/supply/shared/supplyRbacDefinitions');
const {
  WMS_PERMISSIONS,
  WMS_RBAC_PROFILES,
  hasWmsPermission
} = require('../../domains/logistics-operational/shared/wmsRbacDefinitions');

const PROFILES = Object.freeze([
  { id: 'operator', wms_profile: 'warehouse_operator', supply_profile: 'procurement_analyst', role: 'operador', hierarchy_level: 4 },
  { id: 'supervisor', wms_profile: 'warehouse_supervisor', supply_profile: 'manager_procurement', role: 'supervisor', hierarchy_level: 3 },
  { id: 'manager', wms_profile: 'warehouse_manager', supply_profile: 'manager_supply', role: 'gerente', hierarchy_level: 2 },
  { id: 'procurement', wms_profile: 'warehouse_operator', supply_profile: 'manager_procurement', role: 'gerente', hierarchy_level: 3 },
  { id: 'admin', wms_profile: 'warehouse_manager', supply_profile: 'manager_supply', role: 'admin', hierarchy_level: 0 }
]);

function _wmsUser(p) {
  return {
    role: p.role,
    hierarchy_level: p.hierarchy_level,
    profile_code: p.wms_profile,
    wms_profile: p.wms_profile
  };
}

function _supplyUser(p) {
  return {
    role: p.role,
    hierarchy_level: p.hierarchy_level,
    profile_code: p.supply_profile,
    supply_profile: p.supply_profile
  };
}

function validateRbacProfiles() {
  const results = [];
  for (const p of PROFILES) {
    const wmsUser = _wmsUser(p);
    const supplyUser = _supplyUser(p);
    const wmsRead = hasWmsPermission(wmsUser, 'inventory.read');
    const wmsExec = hasWmsPermission(wmsUser, 'picking.execute');
    const supplyRead = hasSupplyPermission(supplyUser, 'supply.read');
    const supplyOrder = hasSupplyPermission(supplyUser, 'purchase.order');

    const row = Object.freeze({
      profile: p.id,
      wms_inventory_read: wmsRead,
      wms_picking_execute: wmsExec,
      supply_read: supplyRead,
      supply_purchase_order: supplyOrder,
      admin_bypass: p.id === 'admin' ? wmsExec && supplyOrder : undefined
    });
    results.push(row);
  }

  const operator = results.find((r) => r.profile === 'operator');
  const manager = results.find((r) => r.profile === 'manager');
  const valid =
    operator.wms_inventory_read &&
    operator.wms_picking_execute &&
    !operator.supply_purchase_order &&
    manager.wms_picking_execute &&
    manager.supply_purchase_order;

  return Object.freeze({ valid, profiles: results, wms_profiles: WMS_RBAC_PROFILES.length, supply_profiles: SUPPLY_RBAC_PROFILES.length });
}

module.exports = {
  PROFILES,
  validateRbacProfiles,
  WMS_PERMISSIONS,
  SUPPLY_PERMISSIONS
};
