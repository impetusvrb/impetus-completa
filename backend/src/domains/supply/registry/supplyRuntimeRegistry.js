'use strict';

const { SUPPLY_RUNTIME_IDENTITY } = require('../core/supplyRuntimeIdentity');

const PLANNED_CAPABILITIES = Object.freeze({
  signal_loader: { phase: 'GF-024', active: true },
  promotion: { phase: 'GF-025', active: true },
  consolidation: { phase: 'GF-026', active: true },
  command_center: { phase: 'GF-027', active: true, status: 'HOMOLOGATION' },
  pilot_integration_layer: { phase: 'GF-026', active: true },
  canonical_bridge: { phase: 'GF-026', active: true },
  rest_apis: { phase: 'GF-027', active: true },
  rbac: { phase: 'GF-027', active: true },
  workspace: { phase: 'GF-027', active: true },
  core_domain: { phase: 'GF-023', active: true },
  wms_integration: { phase: 'GF-026', mode: 'public_api_only', active: true }
});

function getSupplyRuntimeRegistryEntry() {
  return {
    ...SUPPLY_RUNTIME_IDENTITY,
    category: 'Greenfield',
    maturity: 'homologation',
    cockpit_ready: false,
    homologated: false,
    homologation_phase: 'GF-027',
    planned_capabilities: PLANNED_CAPABILITIES,
    cognitive_centers_planned: 7,
    core_domain: { phase: 'GF-023', active: true },
    pilot_runtime: { phase: 'GF-026', active: true },
    rest_apis: { phase: 'GF-027', active: true },
    registered_at: 'GF-022'
  };
}

function snapshotRegistry() {
  return getSupplyRuntimeRegistryEntry();
}

module.exports = {
  PLANNED_CAPABILITIES,
  getSupplyRuntimeRegistryEntry,
  snapshotRegistry
};
