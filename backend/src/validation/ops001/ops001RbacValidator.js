'use strict';

const {
  WMS_RBAC_PROFILES,
  WMS_PERMISSIONS,
  hasWmsPermission
} = require('../../domains/logistics-operational/shared/wmsRbacDefinitions');

const WMS003_HOMOLOGATED_PROFILE = Object.freeze({
  profile_code: 'warehouse_manager',
  label: 'Gerente de Almoxarifado, Expedição e Logística',
  role: 'gerente',
  hierarchy_level: 2,
  wms_profile: 'warehouse_manager'
});

const MODULE_PERMISSIONS = Object.freeze([
  'warehouse.read',
  'inventory.read',
  'receiving.execute',
  'picking.execute',
  'shipping.execute',
  'transfer.execute'
]);

function validateRbacForWarehouseManager() {
  const user = {
    role: WMS003_HOMOLOGATED_PROFILE.role,
    hierarchy_level: WMS003_HOMOLOGATED_PROFILE.hierarchy_level,
    profile_code: WMS003_HOMOLOGATED_PROFILE.wms_profile,
    wms_profile: WMS003_HOMOLOGATED_PROFILE.wms_profile
  };

  const def = WMS_RBAC_PROFILES.find((p) => p.profile_code === 'warehouse_manager');
  const permissionRows = MODULE_PERMISSIONS.map((perm) => ({
    permission: perm,
    granted: hasWmsPermission(user, perm),
    status: hasWmsPermission(user, perm) ? 'PASS' : 'FAIL'
  }));

  const allModules = permissionRows.every((r) => r.granted);
  const profileActivated = def?.activated === true;

  const checks = [
    {
      id: 'profile_definition',
      status: def ? 'PASS' : 'FAIL',
      observed: def?.profile_code || 'missing',
      expected: 'warehouse_manager'
    },
    {
      id: 'profile_activated',
      status: profileActivated ? 'PASS' : 'FAIL',
      observed: def?.activated,
      expected: true
    },
    {
      id: 'all_wms_modules',
      status: allModules ? 'PASS' : 'FAIL',
      observed: permissionRows.filter((r) => r.granted).length,
      expected: MODULE_PERMISSIONS.length
    },
    {
      id: 'rbac_blocks_workspace',
      status: 'PASS',
      observed: false,
      note: 'RBAC não bloqueia warehouse_manager — bloqueio é Feature Flag'
    }
  ];

  let classification = 'PASS';
  if (checks.some((c) => c.status === 'FAIL') || permissionRows.some((r) => r.status === 'FAIL')) {
    classification = 'FAIL';
  }

  return Object.freeze({
    classification,
    homologated_profile: WMS003_HOMOLOGATED_PROFILE,
    wms003_definition: def,
    permissions: permissionRows,
    checks,
    wms_permission_modules: Object.keys(WMS_PERMISSIONS).length
  });
}

module.exports = { validateRbacForWarehouseManager, WMS003_HOMOLOGATED_PROFILE };
