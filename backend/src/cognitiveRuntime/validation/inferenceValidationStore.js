'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../../data/inference-validation');

function loadInferences(tenantId) {
  try {
    const fp = path.join(DATA_DIR, `${String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
    if (!fs.existsSync(fp)) return { inferences: [] };
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (_) {
    return { inferences: [] };
  }
}

function saveInferences(tenantId, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const fp = path.join(DATA_DIR, `${String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
    fs.writeFileSync(fp, JSON.stringify({ ...data, updated_at: new Date().toISOString() }, null, 2));
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = { loadInferences, saveInferences };
