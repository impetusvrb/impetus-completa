'use strict';

const fs = require('fs');
const path = require('path');
const { REPO } = require('./rev002ManifestLoader');

const REQUIRED_EVIDENCE = Object.freeze({
  gf: [
    'GF-021-DISCOVERY-COMPLETION.md',
    'GF-022-RUNTIME-FOUNDATION.md',
    'GF-023-CORE-DOMAIN.md',
    'GF-024-SIGNAL-LOADER.md',
    'GF-025-ARCHITECTURE-CONFORMANCE.md',
    'GF-026-PILOT-INTEGRATION-LAYER.md',
    'GF-027-HOMOLOGATION.md',
    'GF-027-EXECUTIVE-SUMMARY.md'
  ],
  wms: [
    'WMS-001-FOUNDATION.md',
    'WMS-002-OPERATIONAL-COMPATIBILITY-LAYER.md',
    'WMS-003-OPERATIONAL-APIS.md',
    'WMS-004-WORKSPACE.md',
    'WMS-004-ARCHITECTURE-CONFORMANCE.md',
    'WMS-005-EXECUTIVE-SUMMARY.md',
    'WMS-005-ARCHITECTURE-CONFORMANCE.md',
    'WMS-006-EXECUTIVE-SUMMARY.md',
    'WMS-006-ARCHITECTURE-CONFORMANCE.md',
    'WMS-006-BASELINE-CANDIDATE-MANIFEST.json'
  ],
  inc048: [
    'INC-048-CONVERGENCE.md',
    'INC-048-EXECUTIVE-SUMMARY.md',
    'INC-048-ARCHITECTURE-CONFORMANCE.md'
  ],
  rev001: ['REV-001-GAP-MATRIX.md']
});

function validateEvidenceIntegrity() {
  const evidenceDir = path.join(REPO, 'backend/docs/evidence');
  const rows = [];
  const missing = [];

  for (const [phase, files] of Object.entries(REQUIRED_EVIDENCE)) {
    for (const file of files) {
      const abs = path.join(evidenceDir, file);
      const exists = fs.existsSync(abs);
      rows.push({ phase, file, exists });
      if (!exists) missing.push(`${phase}:${file}`);
    }
  }

  const valid = missing.length === 0;
  return Object.freeze({
    valid,
    missing,
    rows,
    total_required: rows.length,
    total_present: rows.filter((r) => r.exists).length
  });
}

module.exports = {
  REQUIRED_EVIDENCE,
  validateEvidenceIntegrity
};
