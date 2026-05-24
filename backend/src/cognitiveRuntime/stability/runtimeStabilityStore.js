'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../../data/runtime-stability');

function loadSnapshots(tenantId) {
  try {
    const fp = path.join(DATA_DIR, `${String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
    if (!fs.existsSync(fp)) return { snapshots: [] };
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (_) {
    return { snapshots: [] };
  }
}

function saveSnapshot(tenantId, snapshot) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const store = loadSnapshots(tenantId);
    const snapshots = [...(store.snapshots || []), snapshot].slice(-60);
    const fp = path.join(DATA_DIR, `${String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
    fs.writeFileSync(fp, JSON.stringify({ tenant_id: tenantId, snapshots, updated_at: new Date().toISOString() }, null, 2));
    return snapshots;
  } catch (_) {
    return [];
  }
}

module.exports = { loadSnapshots, saveSnapshot };
