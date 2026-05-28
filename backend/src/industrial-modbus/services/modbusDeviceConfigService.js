'use strict';

const db = require('../../db');
const flags = require('../config/modbusRealFlags');
const gov = require('../governance/modbusGovernanceService');

const DEFAULT_REGISTER_MAP = [
  { address: 0, quantity: 1, function: 'holding', scale: 1, unit: null, metric_key: 'modbus.holding_0' },
  { address: 1, quantity: 1, function: 'holding', scale: 1, unit: null, metric_key: 'modbus.holding_1' },
];

async function ensureSchema() {
  const fs = require('fs');
  const path = require('path');
  const sql = fs.readFileSync(path.join(__dirname, '../../models/industrial_modbus_migration.sql'), 'utf8');
  await db.query(sql);
  return { ok: true };
}

function _parseRegisterMap(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_REGISTER_MAP;
    }
  }
  return DEFAULT_REGISTER_MAP;
}

async function getDeviceConfig(companyId) {
  const r = await db.query('SELECT * FROM tenant_modbus_devices WHERE company_id = $1::uuid', [companyId]);
  if (r.rows[0]) {
    const row = r.rows[0];
    row.register_map = _parseRegisterMap(row.register_map);
    return row;
  }

  if (!gov.isActiveForTenant(companyId)) return null;

  return {
    company_id: companyId,
    enabled: true,
    mode: flags.modbusRealMode(),
    host: flags.defaultHost(),
    port: flags.defaultPort(),
    unit_id: flags.defaultUnitId(),
    transport: 'tcp',
    poll_interval_ms: flags.pollIntervalMs(),
    connect_timeout_ms: 10000,
    max_retries: 3,
    register_map: DEFAULT_REGISTER_MAP,
    buffer_max: flags.bufferMax(),
    _default: true,
  };
}

async function upsertDeviceConfig(companyId, patch = {}) {
  const existing = await getDeviceConfig(companyId);
  if (existing?._default || !existing) {
    const ins = await db.query(
      `INSERT INTO tenant_modbus_devices
       (company_id, enabled, mode, host, port, unit_id, transport, poll_interval_ms,
        connect_timeout_ms, max_retries, register_map, buffer_max)
       VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
       RETURNING *`,
      [
        companyId,
        patch.enabled !== false,
        patch.mode || flags.modbusRealMode(),
        patch.host || flags.defaultHost(),
        patch.port || flags.defaultPort(),
        patch.unit_id ?? flags.defaultUnitId(),
        patch.transport || 'tcp',
        patch.poll_interval_ms || flags.pollIntervalMs(),
        patch.connect_timeout_ms || 10000,
        patch.max_retries ?? 3,
        JSON.stringify(patch.register_map || DEFAULT_REGISTER_MAP),
        patch.buffer_max || flags.bufferMax(),
      ]
    );
    const row = ins.rows[0];
    row.register_map = _parseRegisterMap(row.register_map);
    return row;
  }

  await db.query(
    `UPDATE tenant_modbus_devices SET
       enabled = COALESCE($2, enabled),
       mode = COALESCE($3, mode),
       host = COALESCE($4, host),
       port = COALESCE($5, port),
       unit_id = COALESCE($6, unit_id),
       register_map = COALESCE($7::jsonb, register_map),
       poll_interval_ms = COALESCE($8, poll_interval_ms),
       updated_at = now()
     WHERE company_id = $1::uuid`,
    [
      companyId,
      patch.enabled,
      patch.mode,
      patch.host,
      patch.port,
      patch.unit_id,
      patch.register_map ? JSON.stringify(patch.register_map) : null,
      patch.poll_interval_ms,
    ]
  );
  return getDeviceConfig(companyId);
}

module.exports = {
  ensureSchema,
  getDeviceConfig,
  upsertDeviceConfig,
  DEFAULT_REGISTER_MAP,
};
