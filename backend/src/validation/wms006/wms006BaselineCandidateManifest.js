'use strict';

const fs = require('fs');
const path = require('path');
const { getInc048Registry } = require('../../integration/inc048/inc048Registry');
const { PILOT_CONTRACT_VERSION, WMS_COMPATIBLE_VERSION } = require('../../domains/supply/pilot/supplyPilotContracts');
const { CONTRACT_VERSION: SUPPLY_CONTRACT_VERSION } = require('../../domains/supply/contracts/interfaces');
const { INC048_CONTRACT_VERSION } = require('../../integration/inc048/inc048Contracts');
const { WMS005_BASELINE } = require('./wms006RegressionBaseline');
const supplyFlags = require('../../domains/supply/shared/supplyFeatureFlags');
const wmsFlags = require('../../domains/logistics-operational/shared/wmsFeatureFlags');

const REPO = path.join(__dirname, '../../../..');

function buildBaselineCandidateManifest() {
  const registry = getInc048Registry();
  const evidenceDir = path.join(REPO, 'backend/docs/evidence');

  const evidenceRefs = [
    'WMS-005-EXECUTIVE-SUMMARY.md',
    'WMS-006-HOMOLOGATION.md',
    'WMS-006-PRODUCTION-READINESS.md',
    'WMS-006-CERTIFICATION.md',
    'WMS-006-ARCHITECTURE-CONFORMANCE.md',
    'INC-048-CONVERGENCE.md',
    'GF-027-HOMOLOGATION.md'
  ].map((f) => ({ file: f, exists: fs.existsSync(path.join(evidenceDir, f)) }));

  return Object.freeze({
    manifest_id: 'BASELINE-CANDIDATE-SUPPLY-WMS-v2.0',
    generated_at: new Date().toISOString(),
    phase: 'WMS-006',
    baseline_system_locked: 'v1.4',
    target_baseline: 'BASELINE-SUPPLY-v2.0',
    subsequent_baseline: 'BASELINE-WMS-v1.0',
    runtimes: Object.freeze({
      homologated_locked_count: 11,
      supply_native: registry.supply_runtime,
      logistics_operational: registry.logistics_runtime,
      logistics_cognitive_locked: 'logistics_native',
      promotion_runtime: registry.promotion_runtime,
      pilot_layer: registry.pilot_layer,
      inc048: registry.inc048
    }),
    contracts: Object.freeze({
      supply: SUPPLY_CONTRACT_VERSION,
      pilot: PILOT_CONTRACT_VERSION,
      wms_compatible: WMS_COMPATIBLE_VERSION,
      inc048: INC048_CONTRACT_VERSION
    }),
    public_apis: registry.public_apis,
    workspaces: registry.operational_workspace,
    command_center: registry.command_center,
    feature_flags_default: Object.freeze({
      supply: supplyFlags.snapshot(),
      wms: wmsFlags.snapshot(),
      production_global: false,
      pilot_activation_only: true
    }),
    modules: Object.freeze([
      'supply_api',
      'supply_workspace',
      'supply_pilot_layer',
      'logistics_operational_api',
      'logistics_operational_workspace',
      'inc048_convergence',
      'supply_promotion_runtime'
    ]),
    inventories: Object.freeze([
      'SYSTEM-RUNTIME-INVENTORY.md',
      'FOUNDATION_RUNTIMES.md',
      'WMS-IMPLEMENTATION-ROADMAP.md',
      'REV-001-GAP-MATRIX.md'
    ]),
    wms005_baseline_ref: WMS005_BASELINE,
    evidence_refs: evidenceRefs,
    rev002_gate: 'mandatory_before_baseline_v2'
  });
}

module.exports = {
  buildBaselineCandidateManifest
};
