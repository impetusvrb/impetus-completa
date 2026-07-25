'use strict';

/**
 * GF-027 — RBAC formal do domínio Supply.
 */

const SUPPLY_PERMISSIONS = Object.freeze({
  'supply.read': ['supply:view', 'supply:manage', 'supply:admin'],
  'supply.write': ['supply:manage', 'supply:admin'],
  'supplier.manage': ['supply:manage', 'supply:admin'],
  'quotation.manage': ['supply:manage', 'supply:admin'],
  'contract.manage': ['supply:manage', 'supply:admin'],
  'approval.execute': ['supply:approve', 'supply:admin'],
  'purchase.request': ['supply:request', 'supply:manage', 'supply:admin'],
  'purchase.order': ['supply:order', 'supply:manage', 'supply:admin']
});

const SUPPLY_RBAC_PROFILES = Object.freeze([
  {
    profile_code: 'procurement_analyst',
    label: 'Procurement Analyst',
    capabilities: ['supply:view', 'supply:request'],
    permissions: ['supply.read', 'purchase.request'],
    activated: true
  },
  {
    profile_code: 'manager_procurement',
    label: 'Manager Procurement',
    capabilities: ['supply:view', 'supply:request', 'supply:order', 'supply:manage', 'supply:approve'],
    permissions: [
      'supply.read',
      'supply.write',
      'supplier.manage',
      'quotation.manage',
      'contract.manage',
      'approval.execute',
      'purchase.request',
      'purchase.order'
    ],
    activated: true
  },
  {
    profile_code: 'manager_supply',
    label: 'Manager Supply',
    capabilities: ['supply:view', 'supply:request', 'supply:order', 'supply:manage', 'supply:approve', 'supply:admin'],
    permissions: Object.keys(SUPPLY_PERMISSIONS),
    activated: true
  }
]);

function _userCapabilities(user = {}) {
  const role = String(user.role || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  if (role === 'admin' || h <= 1) {
    return ['supply:view', 'supply:request', 'supply:order', 'supply:manage', 'supply:approve', 'supply:admin'];
  }
  const profile = String(user.profile_code || user.supply_profile || 'procurement_analyst');
  const def = SUPPLY_RBAC_PROFILES.find((p) => p.profile_code === profile);
  return def ? [...def.capabilities] : ['supply:view'];
}

function hasSupplyPermission(user, permission) {
  if (!user) return false;
  const allowedCaps = SUPPLY_PERMISSIONS[permission];
  if (!allowedCaps) return false;
  const caps = _userCapabilities(user);
  return allowedCaps.some((c) => caps.includes(c));
}

function canAccessSupplyFoundation(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  return role === 'admin' || h <= 1 || hasSupplyPermission(user, 'supply.read');
}

function requireSupplyPermission(permission) {
  return (req, res, next) => {
    if (hasSupplyPermission(req.user, permission)) return next();
    return res.status(403).json({ ok: false, error: 'forbidden', permission, phase: 'GF-027' });
  };
}

module.exports = {
  SUPPLY_PERMISSIONS,
  SUPPLY_RBAC_PROFILES,
  hasSupplyPermission,
  canAccessSupplyFoundation,
  requireSupplyPermission
};
