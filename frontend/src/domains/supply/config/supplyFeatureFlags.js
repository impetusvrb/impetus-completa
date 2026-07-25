/**
 * GF-027 — Feature flags frontend Supply (fail-closed).
 */

function _flag(name, defaultValue = false) {
  const v = import.meta.env[name];
  if (v == null || v === '') return defaultValue;
  return String(v).toLowerCase() === 'true' || v === '1';
}

export function getSupplyFeatureFlagSnapshot() {
  return Object.freeze({
    supply_enabled: _flag('VITE_IMPETUS_SUPPLY_ENABLED', false),
    supply_api_enabled: _flag('VITE_IMPETUS_SUPPLY_API', false),
    supply_menu_enabled: _flag('VITE_IMPETUS_SUPPLY_MENU', false),
    supply_workspace_enabled: _flag('VITE_IMPETUS_SUPPLY_WORKSPACE', false),
    supply_menu_visible: _flag('VITE_IMPETUS_SUPPLY_MENU_VISIBLE', false),
    phase: 'GF-027',
    status: 'HOMOLOGATION'
  });
}

export function isSupplyMenuVisible() {
  const f = getSupplyFeatureFlagSnapshot();
  return f.supply_enabled && f.supply_menu_enabled && f.supply_menu_visible;
}

export function isSupplyWorkspaceEnabled() {
  const f = getSupplyFeatureFlagSnapshot();
  return f.supply_enabled && f.supply_workspace_enabled;
}
