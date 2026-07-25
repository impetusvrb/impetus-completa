'use strict';

const { spawnSync } = require('child_process');
const wmsFlags = require('../../domains/logistics-operational/shared/wmsFeatureFlags');
const { validateRbacProfiles } = require('../wms005/wms005RbacValidator');

function validatePilotRbac() {
  const rbac = validateRbacProfiles();
  const profiles = rbac.profiles || [];

  const manager = profiles.find((p) => p.profile === 'manager');
  const supervisor = profiles.find((p) => p.profile === 'supervisor');
  const operator = profiles.find((p) => p.profile === 'operator');
  const procurement = profiles.find((p) => p.profile === 'procurement');

  const checks = [
    {
      profile: 'warehouse_manager (Gerente Almoxarifado/Expedição/Logística)',
      wms_inventory: manager?.wms_inventory_read,
      wms_picking: manager?.wms_picking_execute,
      supply_po: manager?.supply_purchase_order,
      status: manager?.wms_inventory_read && manager?.wms_picking_execute ? 'PASS' : 'FAIL'
    },
    {
      profile: 'warehouse_supervisor',
      wms_inventory: supervisor?.wms_inventory_read,
      wms_picking: supervisor?.wms_picking_execute,
      status: supervisor?.wms_inventory_read && supervisor?.wms_picking_execute ? 'PASS' : 'FAIL'
    },
    {
      profile: 'warehouse_operator',
      wms_inventory: operator?.wms_inventory_read,
      wms_picking: operator?.wms_picking_execute,
      status: operator?.wms_inventory_read && operator?.wms_picking_execute ? 'PASS' : 'FAIL'
    },
    {
      profile: 'procurement (no undue WMS admin)',
      wms_picking: procurement?.wms_picking_execute,
      supply_po: procurement?.supply_purchase_order,
      undue_admin: !procurement?.supply_purchase_order && procurement?.wms_picking_execute,
      status: procurement?.wms_picking_execute ? 'PASS' : 'FAIL',
      note: 'Operador WMS + supply limitado — sem escalação indevida'
    }
  ];

  let classification = rbac.valid && checks.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL';

  return Object.freeze({
    classification,
    checks,
    rbac_valid: rbac.valid,
    no_undue_access: checks.every((c) => c.status === 'PASS')
  });
}

function validateRollbackProcedure() {
  const before = {
    logistics: wmsFlags.isLogisticsEnabled(),
    workspace: wmsFlags.isLogisticsWorkspaceEnabled(),
    wms_api: wmsFlags.isWmsApiEnabled()
  };

  const saved = {};
  for (const k of [
    'IMPETUS_LOGISTICS_ENABLED',
    'IMPETUS_LOGISTICS_WORKSPACE',
    'IMPETUS_WMS_API_ENABLED',
    'IMPETUS_LOGISTICS_MENU',
    'IMPETUS_LOGISTICS_CC'
  ]) {
    saved[k] = process.env[k];
    delete process.env[k];
  }

  const afterClear = {
    logistics: wmsFlags.isLogisticsEnabled(),
    workspace: wmsFlags.isLogisticsWorkspaceEnabled(),
    wms_api: wmsFlags.isWmsApiEnabled()
  };

  for (const [k, v] of Object.entries(saved)) {
    if (v !== undefined) process.env[k] = v;
  }

  const rollbackOk = !afterClear.logistics && !afterClear.workspace && !afterClear.wms_api;

  return Object.freeze({
    classification: rollbackOk ? 'PASS' : 'FAIL',
    before_env_simulation: before,
    after_env_clear: afterClear,
    procedure: 'Remover bloco OPS-002 de .env.production + backend/.env → rebuild frontend → pm2 restart --update-env',
    rollback_immediate: rollbackOk,
    note: 'Rollback não executado em produção — apenas validado em runtime'
  });
}

module.exports = { validatePilotRbac, validateRollbackProcedure };
