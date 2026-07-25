'use strict';

const fs = require('fs');
const path = require('path');
const { REPO, loadFrozenManifest } = require('./rev002ManifestLoader');

const REQUIRED_PATHS = Object.freeze([
  'backend/docs/architecture/SYSTEM-RUNTIME-INVENTORY.md',
  'backend/docs/evidence/FOUNDATION_RUNTIMES.md',
  'backend/docs/architecture/WMS-IMPLEMENTATION-ROADMAP.md',
  'backend/docs/evidence/REV-001-GAP-MATRIX.md',
  'backend/docs/evidence/WMS-006-BASELINE-CANDIDATE-MANIFEST.json',
  'backend/src/domains/supply/pilot/supplyPilotIntegrationLayer.js',
  'backend/src/domains/supply/runtime/supplyPromotionRuntime.js',
  'backend/src/domains/logistics-operational/compatibility/operationalCompatibilityLayer.js',
  'backend/src/integration/inc048/inc048IntegrationRuntime.js',
  'backend/src/domains/supply/contracts/interfaces.js',
  'backend/src/domains/logistics-operational/compatibility/contracts/canonicalContracts.js',
  'backend/src/domains/supply/registry/supplyRuntimeRegistry.js',
  'frontend/src/domains/supply/routes/supplyWorkspaceRegistry.js',
  'frontend/src/domains/logistics-operational/routes/wmsOperationalRegistry.js'
]);

function validateReproducibility() {
  const manifest = loadFrozenManifest();
  const rows = [];
  const implicit = [];

  for (const rel of REQUIRED_PATHS) {
    const abs = path.join(REPO, rel);
    const exists = fs.existsSync(abs);
    rows.push({ path: rel, exists, category: 'artifact' });
    if (!exists) implicit.push(`missing:${rel}`);
  }

  for (const mod of manifest.modules) {
    const map = {
      supply_api: 'backend/src/domains/supply/routes',
      supply_workspace: 'frontend/src/domains/supply',
      supply_pilot_layer: 'backend/src/domains/supply/pilot',
      logistics_operational_api: 'backend/src/domains/logistics-operational/routes',
      logistics_operational_workspace: 'frontend/src/domains/logistics-operational',
      inc048_convergence: 'backend/src/integration/inc048',
      supply_promotion_runtime: 'backend/src/domains/supply/runtime'
    };
    const p = map[mod];
    if (p) {
      const ok = fs.existsSync(path.join(REPO, p));
      rows.push({ path: p, exists: ok, category: `module:${mod}` });
      if (!ok) implicit.push(`module_missing:${mod}`);
    }
  }

  const valid = implicit.length === 0;
  return Object.freeze({
    valid,
    implicit_dependencies: implicit,
    rows,
    manifest_id: manifest.manifest_id,
    reproducible: valid
  });
}

module.exports = {
  validateReproducibility,
  REQUIRED_PATHS
};
