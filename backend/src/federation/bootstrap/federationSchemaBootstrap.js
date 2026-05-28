'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../../db');

let _bootstrapped = false;

async function ensureFederationSchema() {
  if (_bootstrapped) return { ok: true, cached: true };
  try {
    const sqlPath = path.join(__dirname, '../../models/enterprise_federation_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await db.query(sql);
    _bootstrapped = true;
    return { ok: true };
  } catch (err) {
    console.warn('[FEDERATION_SCHEMA_BOOTSTRAP]', err?.message);
    return { ok: false, error: err?.message };
  }
}

async function emitBootAuditTrail() {
  const flags = require('../config/federationFlags');
  const gov = require('../governance/federationGovernanceService');
  if (!flags.isFederationEnabled()) return { emitted: false, reason: 'disabled' };

  const diag = gov.getDiagnostics();
  try {
    await db.query(
      `INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
       VALUES ('federation_boot', 'enterprise_federation', $1, 'system:federation', NOW(), NULL)`,
      [JSON.stringify(diag)]
    );
    return { emitted: true };
  } catch (err) {
    return { emitted: false, error: err?.message };
  }
}

module.exports = { ensureFederationSchema, emitBootAuditTrail };
