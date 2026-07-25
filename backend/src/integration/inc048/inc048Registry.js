'use strict';

const { getSupplyRuntimeRegistryEntry } = require('../../domains/supply/registry/supplyRuntimeRegistry');
const { SUPPLY_RUNTIME_IDENTITY } = require('../../domains/supply/core/supplyRuntimeIdentity');
const { CONTRACT_VERSION: SUPPLY_CONTRACT_VERSION } = require('../../domains/supply/contracts/interfaces');
const {
  PILOT_CONTRACT_VERSION,
  WMS_COMPATIBLE_VERSION
} = require('../../domains/supply/pilot/supplyPilotContracts');
const wmsFlags = require('../../domains/logistics-operational/shared/wmsFeatureFlags');
const { isInc048Enabled } = require('./inc048FeatureFlags');

const LOGISTICS_RUNTIME_ENTRY = Object.freeze({
  runtime_id: 'logistics_operational',
  domain: 'logistics-operational',
  phase: 'WMS-004',
  api_version: 'v1',
  api_phase: 'WMS-003',
  workspace_phase: 'WMS-004',
  cognitive_runtime: 'logistics_native',
  cognitive_locked: true
});

function getInc048Registry() {
  const supply = getSupplyRuntimeRegistryEntry();
  const wms = wmsFlags.snapshot();

  return Object.freeze({
    inc048: { id: 'INC-048', active: isInc048Enabled(), category: 'Architectural Convergence' },
    supply_runtime: {
      runtime_id: SUPPLY_RUNTIME_IDENTITY.runtime_id,
      version: SUPPLY_RUNTIME_IDENTITY.version,
      maturity: supply.maturity,
      homologation_phase: supply.homologation_phase,
      rest_apis: supply.rest_apis,
      pilot_integration_layer: supply.planned_capabilities?.pilot_integration_layer
    },
    logistics_runtime: LOGISTICS_RUNTIME_ENTRY,
    promotion_runtime: { phase: 'GF-025', active: true, runtime_id: 'supply_native' },
    pilot_layer: {
      phase: 'GF-026',
      contract_version: PILOT_CONTRACT_VERSION,
      wms_compatible: WMS_COMPATIBLE_VERSION
    },
    public_apis: {
      supply: { base: '/api/supply/v1', contract_version: SUPPLY_CONTRACT_VERSION, phase: 'GF-027' },
      wms: { base: '/api/logistics-operational/v1', phase: wms.phase || 'WMS-003' }
    },
    operational_workspace: {
      supply: { path: '/app/supply/workspace', phase: 'GF-027' },
      wms: { path: '/app/logistics-operational/workspace', phase: 'WMS-004' }
    },
    command_center: {
      supply: { runtime_id: 'supply_native', payload: 'supply_cognitive_runtime' },
      logistics_cognitive: { runtime_id: 'logistics_native' },
      logistics_operational: { exposure: 'WmsOperationalCcExposure', phase: 'WMS-004' }
    },
    wms_flags: wms
  });
}

module.exports = {
  LOGISTICS_RUNTIME_ENTRY,
  getInc048Registry
};
