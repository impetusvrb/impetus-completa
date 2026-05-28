'use strict';

const db = require('../../db');
const flags = require('../config/mqttRealFlags');
const gov = require('../governance/mqttGovernanceService');

async function ensureSchema() {
  const fs = require('fs');
  const path = require('path');
  const sql = fs.readFileSync(path.join(__dirname, '../../models/industrial_mqtt_migration.sql'), 'utf8');
  await db.query(sql);
  return { ok: true };
}

async function getBrokerConfig(companyId) {
  const r = await db.query('SELECT * FROM tenant_mqtt_brokers WHERE company_id = $1::uuid', [companyId]);
  if (r.rows[0]) return r.rows[0];

  if (!gov.isActiveForTenant(companyId)) return null;

  return {
    company_id: companyId,
    enabled: true,
    mode: flags.mqttRealMode(),
    broker_url: flags.defaultBrokerUrl(),
    client_id: `impetus-${String(companyId).slice(0, 8)}`,
    topic_subscriptions: ['plant/#', 'environment/#', 'impetus/telemetry/#'],
    qos: 1,
    clean_session: true,
    reconnect_period_ms: flags.reconnectPeriodMs(),
    connect_timeout_ms: 30000,
    buffer_max: flags.bufferMax(),
    _default: true,
  };
}

async function upsertBrokerConfig(companyId, patch = {}) {
  const existing = await getBrokerConfig(companyId);
  if (existing?._default || !existing) {
    const ins = await db.query(
      `INSERT INTO tenant_mqtt_brokers
       (company_id, enabled, mode, broker_url, client_id, username, password_env_key,
        topic_subscriptions, qos, clean_session, reconnect_period_ms, connect_timeout_ms, buffer_max)
       VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        companyId,
        patch.enabled !== false,
        patch.mode || flags.mqttRealMode(),
        patch.broker_url || flags.defaultBrokerUrl(),
        patch.client_id || `impetus-${String(companyId).slice(0, 8)}`,
        patch.username || null,
        patch.password_env_key || null,
        patch.topic_subscriptions || ['plant/#', 'environment/#'],
        patch.qos ?? 1,
        patch.clean_session !== false,
        patch.reconnect_period_ms || flags.reconnectPeriodMs(),
        patch.connect_timeout_ms || 30000,
        patch.buffer_max || flags.bufferMax(),
      ]
    );
    return ins.rows[0];
  }

  await db.query(
    `UPDATE tenant_mqtt_brokers SET
       enabled = COALESCE($2, enabled),
       mode = COALESCE($3, mode),
       broker_url = COALESCE($4, broker_url),
       topic_subscriptions = COALESCE($5, topic_subscriptions),
       qos = COALESCE($6, qos),
       updated_at = now()
     WHERE company_id = $1::uuid`,
    [
      companyId,
      patch.enabled,
      patch.mode,
      patch.broker_url,
      patch.topic_subscriptions,
      patch.qos,
    ]
  );
  return getBrokerConfig(companyId);
}

function resolvePassword(config) {
  const key = config?.password_env_key;
  if (!key) return null;
  return process.env[key] || null;
}

module.exports = {
  ensureSchema,
  getBrokerConfig,
  upsertBrokerConfig,
  resolvePassword,
};
