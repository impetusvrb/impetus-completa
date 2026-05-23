'use strict';

const fs = require('fs');
const path = require('path');

const STORE_DIR = path.join(__dirname, '../../../../data/governance-learning');

function _ensureDir() {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
  } catch (_) {}
}

function _storePath(tenantId) {
  _ensureDir();
  const safe = String(tenantId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(STORE_DIR, `${safe}.json`);
}

function loadGovernanceLearningStore(tenantId = 'default') {
  try {
    const p = _storePath(tenantId);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {}
  return {
    tenant_id: tenantId,
    snapshots: [],
    recommendations_log: [],
    accepted: [],
    rejected: [],
    updated_at: null
  };
}

function saveGovernanceLearningStore(tenantId = 'default', store = {}) {
  try {
    const p = _storePath(tenantId);
    const data = { ...store, tenant_id: tenantId, updated_at: new Date().toISOString() };
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, path: p };
  } catch (e) {
    return { ok: false, error: String(e.message) };
  }
}

module.exports = { loadGovernanceLearningStore, saveGovernanceLearningStore, STORE_DIR };
