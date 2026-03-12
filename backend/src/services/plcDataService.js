/**
 * Serviço de dados para IA de Coleta
 * PERMISSÕES: ler manuais, salvar coleta, análise e alertas
 */
const db = require('../db');
const ai = require('./ai');

/**
 * Busca manuais do equipamento no banco (para IA de coleta)
 */
async function getManualsForEquipment(companyId, equipmentId, equipmentName) {
  const searchText = `${equipmentId} ${equipmentName || ''}`.trim();
  const emb = await ai.embedText(searchText);
  if (!emb) return [];

  try {
    const vectorStr = Array.isArray(emb) ? '[' + emb.join(',') + ']' : emb;
    const r = await db.query(`
      SELECT mc.chunk_text, m.title, m.equipment_type, m.model
      FROM manual_chunks mc
      JOIN manuals m ON mc.manual_id = m.id
      WHERE (m.company_id = $1 OR m.company_id IS NULL)
        AND mc.embedding IS NOT NULL
      ORDER BY mc.embedding <=> $2::vector
      LIMIT 6
    `, [companyId, vectorStr]);
    return (r.rows || []).map(row => ({
      title: row.title || `${row.equipment_type || ''} ${row.model || ''}`.trim(),
      chunk_text: row.chunk_text
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Salva dados coletados do PLC/ sensores
 * Variáveis: machine_status, motor_temperature, vibration_level, oil_level,
 * water_flow, hydraulic_pressure, electrical_current, rpm, alarm_state
 */
async function saveCollectedData(companyId, data) {
  const statusVal = data.status ?? data.machine_status;
  const tempVal = data.temperature ?? data.motor_temperature;
  const vibVal = data.vibration ?? data.vibration_level;
  const pressVal = data.pressure ?? data.hydraulic_pressure;

  const r = await db.query(`
    INSERT INTO plc_collected_data (
      company_id, equipment_id, equipment_name, temperature, pressure, vibration,
      status, rpm, power_kw, oil_level, water_flow, hydraulic_pressure,
      electrical_current, motor_temperature, vibration_level, alarm_state, raw_data
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `, [
    companyId,
    data.equipment_id,
    data.equipment_name || null,
    tempVal ?? null,
    pressVal ?? null,
    vibVal ?? null,
    statusVal || null,
    data.rpm ?? null,
    data.power_kw ?? null,
    data.oil_level ?? null,
    data.water_flow ?? null,
    data.hydraulic_pressure ?? pressVal ?? null,
    data.electrical_current ?? null,
    data.motor_temperature ?? tempVal ?? null,
    data.vibration_level ?? vibVal ?? null,
    data.alarm_state || null,
    data.raw_data ? JSON.stringify(data.raw_data) : null
  ]);
  return r.rows[0];
}

/**
 * Salva análise e cria alerta
 */
async function saveAnalysisAndAlert(companyId, analysis) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const analR = await client.query(`
      INSERT INTO plc_analysis (company_id, equipment_id, equipment_name, collected_data_id, variation_type, variation_description, severity, possible_causes, manual_ids_consulted, analysis_raw)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      companyId,
      analysis.equipment_id,
      analysis.equipment_name || null,
      analysis.collected_data_id || null,
      analysis.variation_type || null,
      analysis.variation_description || null,
      analysis.severity || 'medium',
      JSON.stringify(analysis.possible_causes || []),
      analysis.manual_ids_consulted || [],
      analysis.analysis_raw || ''
    ]);

    const anal = analR.rows[0];

    await client.query(`
      INSERT INTO plc_alerts (company_id, analysis_id, equipment_id, equipment_name, title, message, severity, possible_causes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      companyId,
      anal.id,
      analysis.equipment_id,
      analysis.equipment_name || null,
      analysis.alert_title || `Variação detectada: ${analysis.equipment_id}`,
      analysis.alert_message || analysis.variation_description || '',
      analysis.severity || 'medium',
      JSON.stringify(analysis.possible_causes || [])
    ]);

    await client.query('COMMIT');
    return anal;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getManualsForEquipment,
  saveCollectedData,
  saveAnalysisAndAlert
};
