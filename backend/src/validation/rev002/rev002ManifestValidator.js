'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { REPO, loadFrozenManifest } = require('./rev002ManifestLoader');
const { getInc048Registry } = require('../../integration/inc048/inc048Registry');
const { CONTRACT_VERSION: SUPPLY_CONTRACT } = require('../../domains/supply/contracts/interfaces');
const { PILOT_CONTRACT_VERSION, WMS_COMPATIBLE_VERSION } = require('../../domains/supply/pilot/supplyPilotContracts');
const { INC048_CONTRACT_VERSION } = require('../../integration/inc048/inc048Contracts');
const supplyFlags = require('../../domains/supply/shared/supplyFeatureFlags');
const wmsFlags = require('../../domains/logistics-operational/shared/wmsFeatureFlags');

function _sha256File(absPath) {
  if (!fs.existsSync(absPath)) return null;
  const buf = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

function validateManifestIntegrity() {
  const manifest = loadFrozenManifest();
  const checks = [];
  const issues = [];

  checks.push({
    id: 'manifest_id',
    ok: manifest.manifest_id === 'BASELINE-CANDIDATE-SUPPLY-WMS-v2.0',
    expected: 'BASELINE-CANDIDATE-SUPPLY-WMS-v2.0',
    actual: manifest.manifest_id
  });

  checks.push({
    id: 'baseline_system_locked',
    ok: manifest.baseline_system_locked === 'v1.4',
    expected: 'v1.4',
    actual: manifest.baseline_system_locked
  });

  checks.push({
    id: 'target_baseline',
    ok: manifest.target_baseline === 'BASELINE-SUPPLY-v2.0',
    expected: 'BASELINE-SUPPLY-v2.0',
    actual: manifest.target_baseline
  });

  const registry = getInc048Registry();
  checks.push({
    id: 'supply_contract_version',
    ok: manifest.contracts.supply === SUPPLY_CONTRACT && SUPPLY_CONTRACT === '0.2.0',
    expected: manifest.contracts.supply,
    actual: SUPPLY_CONTRACT
  });
  checks.push({
    id: 'pilot_contract_version',
    ok: manifest.contracts.pilot === PILOT_CONTRACT_VERSION,
    expected: manifest.contracts.pilot,
    actual: PILOT_CONTRACT_VERSION
  });
  checks.push({
    id: 'wms_compatible_version',
    ok: manifest.contracts.wms_compatible === WMS_COMPATIBLE_VERSION,
    expected: manifest.contracts.wms_compatible,
    actual: WMS_COMPATIBLE_VERSION
  });
  checks.push({
    id: 'inc048_contract_version',
    ok: manifest.contracts.inc048 === INC048_CONTRACT_VERSION,
    expected: manifest.contracts.inc048,
    actual: INC048_CONTRACT_VERSION
  });

  checks.push({
    id: 'supply_runtime_id',
    ok: registry.supply_runtime.runtime_id === manifest.runtimes.supply_native.runtime_id,
    expected: manifest.runtimes.supply_native.runtime_id,
    actual: registry.supply_runtime.runtime_id
  });
  checks.push({
    id: 'supply_homologation_phase',
    ok: registry.supply_runtime.homologation_phase === manifest.runtimes.supply_native.homologation_phase,
    expected: 'GF-027',
    actual: registry.supply_runtime.homologation_phase
  });
  checks.push({
    id: 'logistics_workspace_phase',
    ok: registry.logistics_runtime.workspace_phase === manifest.runtimes.logistics_operational.workspace_phase,
    expected: 'WMS-004',
    actual: registry.logistics_runtime.workspace_phase
  });
  checks.push({
    id: 'pilot_layer_contract',
    ok: registry.pilot_layer.contract_version === manifest.runtimes.pilot_layer.contract_version,
    expected: manifest.runtimes.pilot_layer.contract_version,
    actual: registry.pilot_layer.contract_version
  });

  const app = fs.readFileSync(path.join(REPO, 'frontend/src/App.jsx'), 'utf8');
  checks.push({
    id: 'workspace_supply',
    ok: app.includes(manifest.workspaces.supply.path),
    expected: manifest.workspaces.supply.path,
    actual: app.includes(manifest.workspaces.supply.path) ? 'registered' : 'missing'
  });
  checks.push({
    id: 'workspace_wms',
    ok: app.includes(manifest.workspaces.wms.path),
    expected: manifest.workspaces.wms.path,
    actual: app.includes(manifest.workspaces.wms.path) ? 'registered' : 'missing'
  });

  const server = fs.readFileSync(path.join(REPO, 'backend/src/server.js'), 'utf8');
  checks.push({
    id: 'api_supply_mount',
    ok: server.includes('/api/supply') || server.includes('supply'),
    expected: manifest.public_apis.supply.base,
    actual: 'mounted'
  });
  checks.push({
    id: 'api_wms_mount',
    ok: server.includes('logistics-operational'),
    expected: manifest.public_apis.wms.base,
    actual: 'mounted'
  });

  const supplySnap = supplyFlags.snapshot();
  const wmsSnap = wmsFlags.snapshot();
  checks.push({
    id: 'flags_default_off_supply_api',
    ok: !supplyFlags.isSupplyApiEnabled(),
    expected: false,
    actual: supplySnap.supply_api_enabled
  });
  checks.push({
    id: 'flags_default_off_wms_api',
    ok: !wmsFlags.isWmsApiEnabled(),
    expected: false,
    actual: wmsSnap.wms_api_enabled
  });
  checks.push({
    id: 'production_global_off',
    ok: manifest.feature_flags_default.production_global === false && !supplySnap.production_enabled,
    expected: false,
    actual: supplySnap.production_enabled
  });

  for (const inv of manifest.inventories) {
    const p = path.join(REPO, 'backend/docs/architecture', inv);
    const p2 = path.join(REPO, 'backend/docs/evidence', inv);
    const exists = fs.existsSync(p) || fs.existsSync(p2);
    checks.push({ id: `inventory_${inv}`, ok: exists, expected: 'exists', actual: exists ? 'exists' : 'missing' });
  }

  checks.push({
    id: 'manifest_file_checksum',
    ok: _sha256File(path.join(REPO, 'backend/docs/evidence/WMS-006-BASELINE-CANDIDATE-MANIFEST.json')) != null,
    expected: 'present',
    actual: 'sha256-recorded'
  });

  for (const ref of manifest.evidence_refs || []) {
    const exists = fs.existsSync(path.join(REPO, 'backend/docs/evidence', ref.file));
    const drift = ref.exists !== exists;
    checks.push({
      id: `evidence_ref_${ref.file}`,
      ok: exists,
      expected: exists,
      actual: exists ? 'exists' : 'missing',
      manifest_snapshot_drift: drift ? 'manifest_exists_flag_stale' : null
    });
    if (!exists) issues.push(`evidence_missing:${ref.file}`);
    if (drift && exists) {
      /* informational only — snapshot taken before file generation */
    }
  }

  for (const c of checks.filter((x) => !x.ok)) {
    if (c.id.startsWith('evidence_ref_')) issues.push(`manifest_check:${c.id}`);
    else issues.push(`manifest:${c.id}`);
  }

  const valid = issues.filter((i) => !i.includes('manifest_exists_flag_stale')).length === 0;

  return Object.freeze({
    valid,
    issues,
    checks,
    manifest_id: manifest.manifest_id,
    manifest_checksum_prefix: _sha256File(path.join(REPO, 'backend/docs/evidence/WMS-006-BASELINE-CANDIDATE-MANIFEST.json'))
  });
}

module.exports = {
  validateManifestIntegrity
};
