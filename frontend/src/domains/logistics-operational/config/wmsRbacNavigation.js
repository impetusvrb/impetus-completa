/**
 * WMS-004 — RBAC navegação (espelho WMS-003 — sem novas regras).
 */

const WMS_PERMISSION_MODULES = Object.freeze({
  dashboard: 'warehouse.read',
  warehouses: 'warehouse.read',
  inventory: 'inventory.read',
  receiving: 'receiving.execute',
  picking: 'picking.execute',
  shipping: 'shipping.execute',
  transfers: 'transfer.execute',
  warehouse_intelligence: 'warehouse.read',
  cognitive_logistics: 'warehouse.read'
});

const WMS_RBAC_PROFILES = Object.freeze({
  warehouse_operator: ['warehouse.read', 'inventory.read', 'receiving.execute', 'picking.execute', 'shipping.execute', 'transfer.execute'],
  warehouse_supervisor: Object.values(WMS_PERMISSION_MODULES),
  warehouse_manager: Object.values(WMS_PERMISSION_MODULES)
});

function _userProfile() {
  try {
    const raw = localStorage.getItem('impetus_user');
    const u = raw ? JSON.parse(raw) : {};
    if (String(u.role || '').toLowerCase() === 'admin' || (u.hierarchy_level ?? 5) <= 1) {
      return 'warehouse_manager';
    }
    return u.profile_code || u.wms_profile || 'warehouse_operator';
  } catch {
    return 'warehouse_operator';
  }
}

function _userPermissions() {
  const profile = _userProfile();
  return WMS_RBAC_PROFILES[profile] || WMS_RBAC_PROFILES.warehouse_operator;
}

export function canAccessWmsModule(moduleId) {
  const perm = WMS_PERMISSION_MODULES[moduleId];
  if (!perm) return false;
  return _userPermissions().includes(perm);
}

export function filterNavByRbac(items = []) {
  return items.filter((item) => canAccessWmsModule(item.id));
}

export { WMS_PERMISSION_MODULES, WMS_RBAC_PROFILES };
