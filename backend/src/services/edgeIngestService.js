/**
 * IMPETUS - Ingest de dados do Edge
 * Recebe leituras de agentes edge e persiste em plc_collected_data
 * Autenticação: edge_id + company_id + token obrigatórios; agente registado em edge_agents com token_hash.
 */
const db = require('../db');
const plcData = require('./plcDataService');
const crypto = require('crypto');

/**
 * Processa payload do edge agent
 * Payload: { edge_id, company_id, token, readings: [{ machine_identifier, temperature, vibration, status, ... }] }
 */
async function ingest(payload) {
  const { edge_id, company_id, token, readings } = payload || {};
  if (!edge_id || !company_id) {
    throw new Error('edge_id e company_id obrigatórios');
  }

  const list = Array.isArray(readings) ? readings : (readings ? [readings] : []);
  if (!list.length) {
    throw new Error('readings obrigatório (array de leituras)');
  }

  let r;
  try {
    r = await db.query(
      'SELECT id, token_hash FROM edge_agents WHERE company_id = $1 AND edge_id = $2 AND enabled = true',
      [company_id, edge_id]
    );
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('edge_agents') && msg.includes('does not exist')) {
      throw new Error(
        'Tabela edge_agents inexistente. Execute backend/src/models/lacunas_ind4_migration.sql (secção edge_agents).'
      );
    }
    throw e;
  }

  const agentRow = r.rows?.[0];
  if (!agentRow) {
    throw new Error(
      'Edge não registado ou desativado. Registe o agente em POST /api/integrations/edge/register'
    );
  }
  if (!agentRow.token_hash) {
    throw new Error(
      'Edge sem token configurado. Registe novamente em POST /api/integrations/edge/register'
    );
  }
  if (!token || typeof token !== 'string') {
    throw new Error('token obrigatório no corpo (mesmo valor devolvido no registo do edge)');
  }
  const inputHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex');
  if (inputHash !== agentRow.token_hash) {
    throw new Error('token inválido');
  }

  await db.query(
    'UPDATE edge_agents SET last_seen_at = now() WHERE company_id = $1 AND edge_id = $2',
    [company_id, edge_id]
  );

  let processed = 0;
  for (const rd of list) {
    const equipmentId = rd.machine_identifier || rd.equipment_id || rd.equipmentId;
    const equipmentName = rd.machine_name || rd.equipment_name || equipmentId;

    const data = {
      equipment_id: equipmentId,
      equipment_name: equipmentName,
      temperature: rd.temperature ?? rd.motor_temperature,
      pressure: rd.pressure ?? rd.hydraulic_pressure,
      vibration: rd.vibration ?? rd.vibration_level,
      status: rd.status ?? rd.machine_status ?? 'running',
      machine_status: rd.status ?? rd.machine_status ?? 'running',
      oil_level: rd.oil_level,
      water_flow: rd.water_flow,
      electrical_current: rd.electrical_current,
      rpm: rd.rpm,
      alarm_state: rd.alarm_state ?? 'ok',
      raw_data: {
        timestamp: rd.timestamp || new Date().toISOString(),
        source: 'edge',
        edge_id
      }
    };

    try {
      await plcData.saveCollectedData(company_id, data);
      processed++;
    } catch (err) {
      console.warn('[EDGE_INGEST] save', equipmentId, err?.message);
    }
  }

  return { processed };
}

/**
 * Registra edge agent (para admin configurar tokens)
 */
async function registerEdgeAgent(companyId, { edge_id, name }) {
  const token = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await db.query(`
    INSERT INTO edge_agents (company_id, edge_id, name, token_hash, enabled)
    VALUES ($1, $2, $3, $4, true)
    ON CONFLICT (company_id, edge_id) DO UPDATE SET
      name = EXCLUDED.name,
      token_hash = EXCLUDED.token_hash,
      enabled = true
    RETURNING id
  `, [companyId, edge_id, name || edge_id, tokenHash]);

  return { edge_id, token };
}

const ONLINE_MS = 5 * 60 * 1000;

/**
 * Lista agentes edge da empresa (sem expor token_hash)
 */
async function listEdgeAgents(companyId) {
  try {
    const r = await db.query(
      `
      SELECT id, edge_id, name, enabled, last_seen_at, created_at
      FROM edge_agents
      WHERE company_id = $1
      ORDER BY created_at DESC
    `,
      [companyId]
    );
    const now = Date.now();
    return (r.rows || []).map((row) => {
      const seen = row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
      const online = row.enabled && seen && now - seen < ONLINE_MS;
      return {
        id: row.id,
        edge_id: row.edge_id,
        name: row.name || null,
        enabled: row.enabled !== false,
        last_seen_at: row.last_seen_at || null,
        status: online ? 'online' : 'offline'
      };
    });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('edge_agents') && msg.includes('does not exist')) {
      return [];
    }
    throw e;
  }
}

/**
 * Revoga agente (disable); ingest passa a falhar até novo register (novo token).
 */
async function revokeEdgeAgent(companyId, agentId) {
  const r = await db.query(
    `
    UPDATE edge_agents SET enabled = false
    WHERE id = $1 AND company_id = $2
    RETURNING id
  `,
    [agentId, companyId]
  );
  if (!r.rows?.length) {
    const err = new Error('Agente não encontrado');
    err.status = 404;
    throw err;
  }
  return { ok: true };
}

module.exports = {
  ingest,
  registerEdgeAgent,
  listEdgeAgents,
  revokeEdgeAgent
};
