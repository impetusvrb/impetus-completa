'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '../../../..');
const MANIFEST_PATH = path.join(REPO, 'backend/docs/evidence/WMS-006-BASELINE-CANDIDATE-MANIFEST.json');

function loadFrozenManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error('BASELINE_CANDIDATE_MANIFEST_MISSING');
  }
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  return Object.freeze(JSON.parse(raw));
}

module.exports = {
  MANIFEST_PATH,
  REPO,
  loadFrozenManifest
};
