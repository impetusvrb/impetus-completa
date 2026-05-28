'use strict';

const db = require('../../db');
const flags = require('../config/opcuaRealFlags');
const gov = require('../governance/opcuaGovernanceService');

async function ensureSchema() {
  const fs = require('fs');
  const path = require('path');
  const sql = fs.readFileSync(path.join(__dirname, '../../models/industrial_opcua_migration.sql'), 'utf8');
  await db.query(sql);
  return { ok: true };
}

function _labEndpointUrl() {
  try {
    const fs = require('fs');
    const p = require('path').join(__dirname, '../../../.opcua-lab-endpoint.txt');
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  } catch { /* optional */ }
  return flags.defaultEndpointUrl();
}

async function getServerConfig(companyId) {
  const r = await db.query('SELECT * FROM tenant_opcua_servers WHERE company_id = $1::uuid', [companyId]);
  if (r.rows[0]) {
    const row = r.rows[0];
    row.endpoint_url = _labEndpointUrl() || row.endpoint_url;
    return row;
  }

  if (!gov.isActiveForTenant(companyId)) return null;

  return {
    company_id: companyId,
    enabled: true,
    mode: flags.opcuaRealMode(),
    endpoint_url: _labEndpointUrl(),
    application_name: 'IMPETUS_OPCUA',
    security_mode: 'None',
    security_policy: 'None',
    node_subscriptions: ['ns=2;s=Simulator1', 'ns=2;s=Temperature'],
    /* lab local: namespace urn:impetus:lab → tipicamente index 2 */
    sampling_interval_ms: 1000,
    publishing_interval_ms: 1000,
    session_timeout_ms: 60000,
    reconnect_period_ms: flags.reconnectPeriodMs(),
    max_retry: 10,
    buffer_max: flags.bufferMax(),
    _default: true,
  };
}

async function upsertServerConfig(companyId, patch = {}) {
  const existing = await getServerConfig(companyId);
  if (existing?._default || !existing) {
    const ins = await db.query(
      `INSERT INTO tenant_opcua_servers
       (company_id, enabled, mode, endpoint_url, application_name, security_mode, security_policy,
        username, password_env_key, node_subscriptions, sampling_interval_ms, publishing_interval_ms,
        session_timeout_ms, reconnect_period_ms, max_retry, buffer_max, default_unit)
       VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        companyId,
        patch.enabled !== false,
        patch.mode || flags.opcuaRealMode(),
        patch.endpoint_url || flags.defaultEndpointUrl(),
        patch.application_name || 'IMPETUS_OPCUA',
        patch.security_mode || 'None',
        patch.security_policy || 'None',
        patch.username || null,
        patch.password_env_key || null,
        patch.node_subscriptions || ['ns=2;s=Simulator1'],
        patch.sampling_interval_ms || 1000,
        patch.publishing_interval_ms || 1000,
        patch.session_timeout_ms || 60000,
        patch.reconnect_period_ms || flags.reconnectPeriodMs(),
        patch.max_retry ?? 10,
        patch.buffer_max || flags.bufferMax(),
        patch.default_unit || null,
      ]
    );
    return ins.rows[0];
  }

  await db.query(
    `UPDATE tenant_opcua_servers SET
       enabled = COALESCE($2, enabled),
       mode = COALESCE($3, mode),
       endpoint_url = COALESCE($4, endpoint_url),
       node_subscriptions = COALESCE($5, node_subscriptions),
       sampling_interval_ms = COALESCE($6, sampling_interval_ms),
       updated_at = now()
     WHERE company_id = $1::uuid`,
    [
      companyId,
      patch.enabled,
      patch.mode,
      patch.endpoint_url,
      patch.node_subscriptions,
      patch.sampling_interval_ms,
    ]
  );
  return getServerConfig(companyId);
}

function resolvePassword(config) {
  const key = config?.password_env_key;
  if (!key) return null;
  return process.env[key] || null;
}

module.exports = {
  ensureSchema,
  getServerConfig,
  upsertServerConfig,
  resolvePassword,
};
