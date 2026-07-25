'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = path.join(__dirname, '../../../..');
const BASELINE_MANIFEST_PATH = path.join(REPO, 'backend/docs/evidence/BASELINE-SUPPLY-v2.0-MANIFEST.json');

function loadBaselineManifest() {
  if (!fs.existsSync(BASELINE_MANIFEST_PATH)) {
    throw new Error('BASELINE_SUPPLY_V2_MANIFEST_MISSING');
  }
  const raw = JSON.parse(fs.readFileSync(BASELINE_MANIFEST_PATH, 'utf8'));
  const { release_signature, ...core } = raw;
  const computed = crypto.createHash('sha256').update(JSON.stringify(core)).digest('hex');
  return Object.freeze({
    manifest: Object.freeze(raw),
    signature_match: computed === release_signature,
    computed_signature: computed,
    stored_signature: release_signature || null
  });
}

module.exports = {
  REPO,
  BASELINE_MANIFEST_PATH,
  loadBaselineManifest
};
