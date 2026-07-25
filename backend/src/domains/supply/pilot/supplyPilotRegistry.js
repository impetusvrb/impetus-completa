'use strict';

const { PILOT_CONTRACT_VERSION, WMS_COMPATIBLE_VERSION } = require('./supplyPilotContracts');

const DEFAULT_PILOT_TENANTS = Object.freeze([]);

let _registry = {
  pilot_enabled_globally: false,
  contract_version: PILOT_CONTRACT_VERSION,
  wms_compatible_version: WMS_COMPATIBLE_VERSION,
  tenants: [...DEFAULT_PILOT_TENANTS],
  feature_flags: Object.freeze({
    pilot_enabled: false,
    cc_inbound: false,
    logistics_bridge: false
  })
};

function getSupplyPilotRegistry() {
  return Object.freeze({ ..._registry, tenants: Object.freeze([..._registry.tenants]) });
}

function isTenantPilotEnabled(companyId) {
  if (!_registry.feature_flags.pilot_enabled) return false;
  if (_registry.tenants.length === 0) return false;
  return _registry.tenants.includes(String(companyId));
}

function registerPilotTenant(companyId) {
  const id = String(companyId);
  if (!_registry.tenants.includes(id)) {
    _registry.tenants = [..._registry.tenants, id];
  }
}

function resetPilotRegistryForTests() {
  _registry = {
    pilot_enabled_globally: false,
    contract_version: PILOT_CONTRACT_VERSION,
    wms_compatible_version: WMS_COMPATIBLE_VERSION,
    tenants: [],
    feature_flags: Object.freeze({
      pilot_enabled: false,
      cc_inbound: false,
      logistics_bridge: false
    })
  };
}

function snapshotPilotCompatibility() {
  return Object.freeze({
    supply_contract: PILOT_CONTRACT_VERSION,
    wms_api_phase: 'WMS-003',
    wms_compatible: WMS_COMPATIBLE_VERSION,
    compatible: PILOT_CONTRACT_VERSION === WMS_COMPATIBLE_VERSION
  });
}

module.exports = {
  getSupplyPilotRegistry,
  isTenantPilotEnabled,
  registerPilotTenant,
  resetPilotRegistryForTests,
  snapshotPilotCompatibility
};
