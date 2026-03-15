/**
 * IMPETUS - Módulo Integrações e Conectividades
 * CRUD de integrações, teste de conexão, atualização de status
 */
const db = require('../db');
const crypto = require('crypto');

const INTEGRATION_TYPES = [
  'api_rest', 'webhook', 'database', 'mqtt', 'modbus', 'opc_ua',
  'ftp_sftp', 'camera_ip', 'sensor_industrial', 'custom'
];

const FREQUENCY_OPTIONS = [
  { value: 0, label: 'Tempo real' },
  { value: 5, label: 'A cada 5 segundos' },
  { value: 30, label: 'A cada 30 segundos' },
  { value: 60, label: 'A cada 1 minuto' },
  { value: 300, label: 'A cada 5 minutos' },
  { value: -1, label: 'Personalizado' }
];

const DATA_TYPES = [
  'producao', 'temperatura', 'vibracao', 'energia', 'status_maquina',
  'falhas', 'video', 'audio', 'dados_financeiros', 'logs_tecnicos'
];

const DESTINATION_MODULES = [
  'manutencao', 'financeiro', 'producao', 'seguranca', 'qualidade', 'rh', 'almoxarifado'
];

async function list(companyId) {
  const r = await db.query(`
    SELECT id, name, integration_type, origin_connection, frequency_seconds, frequency_mode,
           data_types, destination_module, enabled, last_communication_at, last_status, last_error, created_at
    FROM system_integrations
    WHERE company_id = $1
    ORDER BY name
  `, [companyId]);
  return (r.rows || []).map(formatRow);
}

function formatRow(row) {
  const lastComm = row.last_communication_at;
  let lastCommText = 'Nunca';
  if (lastComm) {
    const sec = Math.floor((Date.now() - new Date(lastComm).getTime()) / 1000);
    if (sec < 60) lastCommText = `${sec} segundos`;
    else if (sec < 3600) lastCommText = `${Math.floor(sec / 60)} minuto(s)`;
    else lastCommText = `${Math.floor(sec / 3600)} hora(s)`;
  }
  return {
    ...row,
    last_communication_text: lastCommText,
    status: row.last_status === 'ok' ? 'Online' : row.last_status === 'error' ? 'Erro' : 'Offline'
  };
}

async function create(companyId, data) {
  const {
    name,
    integration_type,
    origin_connection,
    connection_config = {},
    frequency_seconds = 5,
    frequency_mode = 'realtime',
    data_types = [],
    destination_module
  } = data;

  const r = await db.query(`
    INSERT INTO system_integrations (company_id, name, integration_type, origin_connection, connection_config,
      frequency_seconds, frequency_mode, data_types, destination_module)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    companyId, name || 'Nova Integração', integration_type || 'api_rest',
    origin_connection || null, JSON.stringify(connection_config),
    frequency_seconds || 5, frequency_mode || 'realtime',
    Array.isArray(data_types) ? data_types : [],
    destination_module || null
  ]);

  const row = r.rows[0];
  if (integration_type === 'webhook' && row) {
    const token = crypto.randomBytes(24).toString('hex');
    await db.query(`
      INSERT INTO integration_webhooks (integration_id, webhook_token) VALUES ($1, $2)
    `, [row.id, token]);
    row.webhook_url = `/api/integrations/gateway/webhook/${token}`;
  }
  return formatRow(row);
}

async function update(id, companyId, data) {
  const sets = [];
  const vals = [];
  let i = 1;
  const allowed = ['name', 'origin_connection', 'connection_config', 'frequency_seconds', 'frequency_mode', 'data_types', 'destination_module', 'enabled'];
  for (const k of allowed) {
    if (data[k] !== undefined) {
      if (k === 'connection_config') {
        sets.push(`${k} = $${i}::jsonb`);
        vals.push(JSON.stringify(data[k]));
      } else if (k === 'data_types') {
        sets.push(`${k} = $${i}`);
        vals.push(Array.isArray(data[k]) ? data[k] : []);
      } else {
        sets.push(`${k} = $${i}`);
        vals.push(data[k]);
      }
      i++;
    }
  }
  if (sets.length === 0) return getById(id, companyId);
  vals.push(id, companyId);
  const r = await db.query(`
    UPDATE system_integrations SET ${sets.join(', ')}, updated_at = now()
    WHERE id = $${i} AND company_id = $${i + 1}
    RETURNING *
  `, vals);
  return r.rows[0] ? formatRow(r.rows[0]) : null;
}

async function getById(id, companyId) {
  const r = await db.query(`
    SELECT * FROM system_integrations WHERE id = $1 AND company_id = $2
  `, [id, companyId]);
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  if (row.integration_type === 'webhook') {
    const wh = await db.query('SELECT webhook_token FROM integration_webhooks WHERE integration_id = $1', [id]);
    if (wh.rows[0]) row.webhook_url = `/api/integrations/gateway/webhook/${wh.rows[0].webhook_token}`;
  }
  return formatRow(row);
}

async function remove(id, companyId) {
  await db.query('DELETE FROM system_integrations WHERE id = $1 AND company_id = $2', [id, companyId]);
  return { ok: true };
}

async function testConnection(id, companyId) {
  const row = await getById(id, companyId);
  if (!row) return { ok: false, error: 'Integração não encontrada' };
  const cfg = row.connection_config || {};
  const type = row.integration_type;
  try {
    if (type === 'api_rest') {
      const axios = require('axios');
      const url = (cfg.base_url || '') + (cfg.endpoint || '');
      const method = (cfg.method || 'GET').toUpperCase();
      const headers = {};
      if (cfg.api_key) headers['X-API-Key'] = cfg.api_key;
      if (cfg.authorization) headers['Authorization'] = cfg.authorization;
      const res = await axios.request({ url, method, headers, timeout: 5000 });
      await recordCommunication(id, 'ok', 1);
      return { ok: true, status: res.status, message: 'Conexão bem sucedida' };
    }
    if (type === 'database') {
      const { host, port, database, user, password } = cfg;
      if (!host || !database) return { ok: false, error: 'Host e database obrigatórios' };
      const pg = require('pg');
      const client = new pg.Client({
        host, port: port || 5432, database, user, password,
        connectionTimeoutMillis: 5000
      });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      await recordCommunication(id, 'ok', 1);
      return { ok: true, message: 'Conexão bem sucedida' };
    }
    await recordCommunication(id, 'ok', 0);
    return { ok: true, message: 'Tipo de integração sem teste automatizado. Verifique manualmente.' };
  } catch (err) {
    await recordCommunication(id, 'error', 0, err.message);
    return { ok: false, error: err.message || 'Erro de conexão' };
  }
}

async function recordCommunication(integrationId, status, recordsCount, errorMessage) {
  await db.query(`
    UPDATE system_integrations SET last_communication_at = now(), last_status = $2, last_error = $3, updated_at = now()
    WHERE id = $1
  `, [integrationId, status, errorMessage || null]);
  await db.query(`
    INSERT INTO integration_communication_log (integration_id, status, records_count, error_message)
    VALUES ($1, $2, $3, $4)
  `, [integrationId, status, recordsCount, errorMessage || null]);
}

module.exports = {
  list,
  create,
  update,
  getById,
  remove,
  testConnection,
  INTEGRATION_TYPES,
  FREQUENCY_OPTIONS,
  DATA_TYPES,
  DESTINATION_MODULES
};
