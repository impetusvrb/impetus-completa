'use strict';

const { SUPPLY_RUNTIME_IDENTITY } = require('../core/supplyRuntimeIdentity');
const { logSupplyRuntimeEvent } = require('../shared/supplyObservability');
const flags = require('../shared/supplyFeatureFlags');

let _booted = false;

function buildFoundationDescriptor(overrides = {}) {
  return {
    runtime_id: SUPPLY_RUNTIME_IDENTITY.runtime_id,
    runtime_name: SUPPLY_RUNTIME_IDENTITY.runtime_name,
    version: SUPPLY_RUNTIME_IDENTITY.version,
    status: SUPPLY_RUNTIME_IDENTITY.status,
    cockpit_mode: 'off',
    inactive: true,
    consolidation_applied: false,
    promotion_applied: false,
    binding_ratio: 0,
    centers_count: 0,
    foundation_only: true,
    signal_loader_active: false,
    promotion_active: false,
    consolidation_active: false,
    command_center_active: false,
    ...overrides
  };
}

function startup() {
  if (_booted) return buildFoundationDescriptor();
  _booted = true;
  logSupplyRuntimeEvent('startup', {
    runtime_id: SUPPLY_RUNTIME_IDENTITY.runtime_id,
    version: SUPPLY_RUNTIME_IDENTITY.version,
    status: SUPPLY_RUNTIME_IDENTITY.status
  });
  return buildFoundationDescriptor();
}

function health() {
  const snap = flags.snapshot();
  return {
    ok: true,
    runtime_id: SUPPLY_RUNTIME_IDENTITY.runtime_id,
    version: SUPPLY_RUNTIME_IDENTITY.version,
    status: SUPPLY_RUNTIME_IDENTITY.status,
    foundation: true,
    flags: snap,
    production_enabled: snap.production_enabled,
    menu_visible: snap.menu_visible
  };
}

function resetSupplyFoundationForTests() {
  _booted = false;
}

module.exports = {
  buildFoundationDescriptor,
  startup,
  health,
  resetSupplyFoundationForTests
};
