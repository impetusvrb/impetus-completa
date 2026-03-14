/**
 * IMPETUS - Ingest de dados do Edge
 * Recebe leituras de agentes edge e persiste em plc_collected_data
 * Autenticação: edge_id + company_id + token (opcional, validado contra edge_agents)
 */
const db = require('../db');
const plcData = require('./plcDataService');
const crypto = require('crypto');

/**
 * Processa payload do edge agent
 * Payload: { edge_id, company_id, token?, readings: [{ machine_identifier, temperature, vibration, status, ... }] }
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

  // Validação: se edge_agents tem token_hash, token é obrigatório e deve conferir
  try {
    const r = await db.query(
      'SELECT id, token_hash FROM edge_agents WHERE company_id = $1 AND edge_id = $2 AND enabled = true',
      [company_id, edge_id]
    );
    if (r.rows?.length) {
      const row = r.rows[0];
      if (row.token_hash) {
        if (!token || typeof token !== 'string') {
          throw new Error('token obrigatório para este edge (registre em /api/integrations/edge/register)');
        }
        const inputHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex');
        if (inputHash !== row.token_hash) {
          throw new Error('token inválido');
        }
      }
      await db.query(
        'UPDATE edge_agents SET last_seen_at = now() WHERE company_id = $1 AND edge_id = $2',
        [company_id, edge_id]
      );
    }
  } catch (e) {
    if (e.message?.includes('token')) throw e;
    // Tabela edge_agents pode não existir - continuar sem validação
  }

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
      name = EXCLUDED.name, token_hash = EXCLUDED.token_hash, updated_at = now()
    RETURNING id
  `, [companyId, edge_id, name || edge_id, tokenHash]);

  return { edge_id, token };
}

module.exports = {
  ingest,
  registerEdgeAgent
};
