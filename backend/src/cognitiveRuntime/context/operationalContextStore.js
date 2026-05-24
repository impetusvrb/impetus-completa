'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../../data/operational-context');

function _tenantFile(tenantId) {
  const safe = String(tenantId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${safe}.json`);
}

function loadTenantContext(tenantId) {
  try {
    const fp = _tenantFile(tenantId);
    if (!fs.existsSync(fp)) return { tenant_id: tenantId, events: [], updated_at: null };
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (_) {
    return { tenant_id: tenantId, events: [], updated_at: null };
  }
}

function saveTenantContext(tenantId, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const payload = { ...data, tenant_id: tenantId, updated_at: new Date().toISOString() };
    fs.writeFileSync(_tenantFile(tenantId), JSON.stringify(payload, null, 2));
    return payload;
  } catch (err) {
    return { error: err.message, saved: false };
  }
}

module.exports = { loadTenantContext, saveTenantContext };
