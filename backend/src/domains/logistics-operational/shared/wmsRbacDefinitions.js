'use strict';

/**
 * WMS-003 — Permissões operacionais (RBAC estrutural).
 */

const WMS_PERMISSIONS = Object.freeze({
  'warehouse.read': ['wms:view', 'wms:supervise', 'wms:configure'],
  'warehouse.write': ['wms:configure', 'wms:supervise'],
  'inventory.read': ['wms:view', 'wms:supervise', 'wms:configure'],
  'inventory.write': ['wms:configure', 'wms:supervise'],
  'receiving.execute': ['wms:execute_task', 'wms:supervise', 'wms:configure'],
  'picking.execute': ['wms:execute_task', 'wms:supervise', 'wms:configure'],
  'shipping.execute': ['wms:execute_task', 'wms:supervise', 'wms:configure'],
  'transfer.execute': ['wms:execute_task', 'wms:supervise', 'wms:configure']
});

const WMS_RBAC_PROFILES = Object.freeze([
  {
    profile_code: 'warehouse_operator',
    label: 'Warehouse Operator',
    capabilities: ['wms:view', 'wms:execute_task'],
    permissions: ['warehouse.read', 'inventory.read', 'receiving.execute', 'picking.execute', 'shipping.execute', 'transfer.execute'],
    activated: true
  },
  {
    profile_code: 'warehouse_supervisor',
    label: 'Warehouse Supervisor',
    capabilities: ['wms:view', 'wms:execute_task', 'wms:supervise'],
    permissions: [
      'warehouse.read',
      'warehouse.write',
      'inventory.read',
      'inventory.write',
      'receiving.execute',
      'picking.execute',
      'shipping.execute',
      'transfer.execute'
    ],
    activated: true
  },
  {
    profile_code: 'warehouse_manager',
    label: 'Warehouse Manager',
    capabilities: ['wms:view', 'wms:execute_task', 'wms:supervise', 'wms:configure'],
    permissions: Object.keys(WMS_PERMISSIONS),
    activated: true
  }
]);

function _userCapabilities(user = {}) {
  const role = String(user.role || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  if (role === 'admin' || h <= 1) {
    return ['wms:view', 'wms:execute_task', 'wms:supervise', 'wms:configure'];
  }
  const profile = String(user.profile_code || user.wms_profile || 'warehouse_operator');
  const def = WMS_RBAC_PROFILES.find((p) => p.profile_code === profile);
  return def ? [...def.capabilities] : ['wms:view'];
}

function hasWmsPermission(user, permission) {
  if (!user) return false;
  const allowedCaps = WMS_PERMISSIONS[permission];
  if (!allowedCaps) return false;
  const caps = _userCapabilities(user);
  return allowedCaps.some((c) => caps.includes(c));
}

function canAccessWmsFoundation(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  return role === 'admin' || h <= 1 || hasWmsPermission(user, 'warehouse.read');
}

function requireWmsPermission(permission) {
  return (req, res, next) => {
    if (hasWmsPermission(req.user, permission)) return next();
    return res.status(403).json({ ok: false, error: 'forbidden', permission, phase: 'WMS-003' });
  };
}

module.exports = {
  WMS_PERMISSIONS,
  WMS_RBAC_PROFILES,
  hasWmsPermission,
  canAccessWmsFoundation,
  requireWmsPermission
};
