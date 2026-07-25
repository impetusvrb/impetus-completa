'use strict';

const { REFERENCED_VERSIONS } = require('./inc048Contracts');
const { getInc048Registry } = require('./inc048Registry');
const { CONTRACT_VERSION: SUPPLY_CONTRACT_VERSION } = require('../../domains/supply/contracts/interfaces');
const {
  PILOT_CONTRACT_VERSION,
  WMS_COMPATIBLE_VERSION
} = require('../../domains/supply/pilot/supplyPilotContracts');
const wmsFlags = require('../../domains/logistics-operational/shared/wmsFeatureFlags');
const supplyFlags = require('../../domains/supply/shared/supplyFeatureFlags');
const { isInc048Enabled } = require('./inc048FeatureFlags');

function _row(component, version, compatible, notes = '') {
  return Object.freeze({ component, version, compatible, notes });
}

function buildCompatibilityMatrix() {
  const registry = getInc048Registry();
  const wmsSnap = wmsFlags.snapshot();
  const supplySnap = supplyFlags.snapshot();

  const pilotWmsMatch = PILOT_CONTRACT_VERSION === WMS_COMPATIBLE_VERSION;

  const rows = [
    _row('Supply Runtime', registry.supply_runtime.version, true, `maturity=${registry.supply_runtime.maturity}`),
    _row('Supply Canonical Contracts', SUPPLY_CONTRACT_VERSION, SUPPLY_CONTRACT_VERSION === REFERENCED_VERSIONS.supply_canonical, 'GF-027 SSOT'),
    _row('Pilot Integration Layer', PILOT_CONTRACT_VERSION, true, 'GF-026 ACTIVE'),
    _row('Pilot ↔ WMS Contract Bridge', WMS_COMPATIBLE_VERSION, pilotWmsMatch, pilotWmsMatch ? 'aligned' : 'MISMATCH'),
    _row('WMS Public APIs', registry.public_apis.wms.phase, wmsSnap.wms_api_enabled !== undefined, 'WMS-003 v1'),
    _row('WMS Operational Workspace', REFERENCED_VERSIONS.wms_workspace, true, 'WMS-004 FE'),
    _row('Supply REST APIs', SUPPLY_CONTRACT_VERSION, true, 'GF-027'),
    _row('Supply Workspace', REFERENCED_VERSIONS.supply_homologation, true, 'GF-027'),
    _row('Promotion Runtime', 'GF-025', registry.promotion_runtime.active === true, 'unchanged'),
    _row('INC-048 Convergence Flag', isInc048Enabled() ? 'ON' : 'OFF', true, 'default false — expected OFF'),
    _row('Supply Feature Flags', supplySnap.phase, supplySnap.phase === 'GF-027', 'fail-closed'),
    _row('WMS Feature Flags', wmsSnap.phase, wmsSnap.phase === 'WMS-004', 'fail-closed'),
    _row('Logistics Cognitive Runtime', 'logistics_native LOCKED', true, 'BASELINE v1.4'),
    _row('Command Center Supply', 'supply_native', true, 'presentation registry'),
    _row('Command Center Logistics', 'logistics_native + WMS-004', true, 'dual exposure')
  ];

  const allCompatible = rows.every((r) => r.compatible !== false);

  return Object.freeze({
    generated_at: new Date().toISOString(),
    inc048_version: '1.0.0',
    all_compatible: allCompatible,
    rows
  });
}

module.exports = {
  buildCompatibilityMatrix
};
