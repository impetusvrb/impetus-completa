'use strict';

const path = require('path');

const CONTEXT_DIR = path.join(__dirname, '../../../data/operational-context');
const CONFIDENCE_DIR = path.join(__dirname, '../../../data/confidence-evolution');
const INFERENCE_DIR = path.join(__dirname, '../../../data/inference-validation');

function validateTenantContextBoundary(user = {}, payload = {}) {
  const tenantId = String(user?.company_id || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fs = require('fs');

  const paths = [
    path.join(CONTEXT_DIR, `${tenantId}.json`),
    path.join(CONFIDENCE_DIR, `${tenantId}.json`),
    path.join(INFERENCE_DIR, `${tenantId}.json`)
  ];

  const isolated_memory_state = paths.every((p) => {
    if (!fs.existsSync(p)) return true;
    try {
      const raw = fs.readFileSync(p, 'utf8');
      const data = JSON.parse(raw);
      return String(data.tenant_id || tenantId) === String(user?.company_id || tenantId);
    } catch (_) {
      return false;
    }
  });
  const isolated_runtime_state = payload.company_id == null || String(payload.company_id) === String(user?.company_id);

  const boundary_integrity = isolated_memory_state && isolated_runtime_state ? 1 : 0.5;
  const tenant_context_safe = boundary_integrity >= 0.9 && isolated_runtime_state;

  return {
    boundary_integrity: Number(boundary_integrity.toFixed(3)),
    tenant_context_safe,
    isolated_runtime_state,
    isolated_memory_state: isolated_memory_state === true,
    storage_scoped: true,
    auto_decisions: false
  };
}

module.exports = { validateTenantContextBoundary };
