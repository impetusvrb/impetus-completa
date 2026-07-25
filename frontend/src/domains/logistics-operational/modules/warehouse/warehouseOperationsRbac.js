/**
 * OPM-001C — RBAC operacional Warehouse (espelho WMS-003 · sem alterar wmsRbacNavigation certificado).
 */
const WRITE_PROFILES = new Set(['warehouse_supervisor', 'warehouse_manager']);

function _currentUser() {
  try {
    const raw = localStorage.getItem('impetus_user');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function _profile() {
  const u = _currentUser();
  if (String(u.role || '').toLowerCase() === 'admin' || (u.hierarchy_level ?? 5) <= 1) {
    return 'warehouse_manager';
  }
  return u.profile_code || u.wms_profile || 'warehouse_operator';
}

export function canWriteWarehouse() {
  const profile = _profile();
  if (String(_currentUser().role || '').toLowerCase() === 'admin') return true;
  if ((_currentUser().hierarchy_level ?? 5) <= 1) return true;
  return WRITE_PROFILES.has(profile);
}

export function getWarehouseUserProfile() {
  return _profile();
}
