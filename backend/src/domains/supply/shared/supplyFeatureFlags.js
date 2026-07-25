'use strict';

function _flag(name, defaultValue = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultValue;
  return String(v).toLowerCase() === 'true' || v === '1';
}

function isSupplyEnabled() {
  return _flag('IMPETUS_SUPPLY_ENABLED', false);
}

function isSupplyApiEnabled() {
  return _flag('IMPETUS_SUPPLY_API', false);
}

function isSupplyMenuEnabled() {
  return _flag('IMPETUS_SUPPLY_MENU', false);
}

function isSupplyWorkspaceEnabled() {
  return _flag('IMPETUS_SUPPLY_WORKSPACE', false);
}

function isSupplyPilotEnabled() {
  return _flag('IMPETUS_SUPPLY_PILOT_ENABLED', false);
}

function isSupplyCcInboundEnabled() {
  return _flag('IMPETUS_SUPPLY_CC_INBOUND', false);
}

function isSupplyLogisticsBridgeEnabled() {
  return _flag('IMPETUS_SUPPLY_LOGISTICS_BRIDGE', false);
}

function isSupplyPilotStrictTenants() {
  return _flag('IMPETUS_SUPPLY_PILOT_STRICT_TENANTS', true);
}

function snapshot() {
  return {
    supply_enabled: isSupplyEnabled(),
    supply_api_enabled: isSupplyApiEnabled(),
    supply_menu_enabled: isSupplyMenuEnabled(),
    supply_workspace_enabled: isSupplyWorkspaceEnabled(),
    supply_runtime_enabled: _flag('IMPETUS_SUPPLY_RUNTIME_ENABLED', false),
    supply_cognitive_enabled: _flag('IMPETUS_SUPPLY_COGNITIVE_ENABLED', false),
    supply_promotion_enabled: _flag('IMPETUS_SUPPLY_PROMOTION_ENABLED', false),
    supply_pilot_enabled: isSupplyPilotEnabled(),
    supply_cc_inbound: isSupplyCcInboundEnabled(),
    supply_logistics_bridge: isSupplyLogisticsBridgeEnabled(),
    supply_menu_visible: _flag('VITE_IMPETUS_SUPPLY_MENU_VISIBLE', false),
    production_enabled: _flag('IMPETUS_SUPPLY_PRODUCTION_ENABLED', false),
    menu_visible: isSupplyMenuEnabled() && _flag('VITE_IMPETUS_SUPPLY_MENU_VISIBLE', false),
    wms_integration_active: isSupplyLogisticsBridgeEnabled(),
    phase: 'GF-027',
    status: 'HOMOLOGATION'
  };
}

module.exports = {
  snapshot,
  _flag,
  isSupplyEnabled,
  isSupplyApiEnabled,
  isSupplyMenuEnabled,
  isSupplyWorkspaceEnabled,
  isSupplyPilotEnabled,
  isSupplyCcInboundEnabled,
  isSupplyLogisticsBridgeEnabled,
  isSupplyPilotStrictTenants
};
