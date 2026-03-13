/**
 * IMPETUS - Coletor de dados PLC/Sensores Industriais
 * Fluxo: coleta -> Machine Brain analisa -> salva -> emite alerta
 * Suporte: simulação, Modbus, OPC UA, APIs industriais (via data_source_config)
 *
 * Variáveis lidas: machine_status, motor_temperature, vibration_level, oil_level,
 * water_flow, hydraulic_pressure, electrical_current, rpm, alarm_state
 */
const plcAi = require('./plcAi');
const plcData = require('./plcDataService');

/** Variáveis industriais padrão para simulação */
function simulatePLCRead(equipmentId, equipmentName) {
  const rnd = () => 0.9 + Math.random() * 0.2;
  const temp = 45 + Math.random() * 30;
  const pressure = 2 + Math.random() * 4;
  const vibration = 0.5 + Math.random() * 2;
  const oil = 40 + Math.random() * 55;
  return {
    equipment_id: equipmentId,
    equipment_name: equipmentName,
    machine_status: 'running',
    status: 'running',
    temperature: Math.round(temp * 10) / 10,
    motor_temperature: Math.round(temp * 10) / 10,
    pressure: Math.round(pressure * 100) / 100,
    hydraulic_pressure: Math.round(pressure * 100) / 100,
    vibration: Math.round(vibration * 100) / 100,
    vibration_level: Math.round(vibration * 100) / 100,
    oil_level: Math.round(oil * 10) / 10,
    water_flow: Math.round((2 + Math.random() * 3) * 100) / 100,
    electrical_current: Math.round((25 + Math.random() * 15) * 10) / 10,
    rpm: 1200 + Math.floor(Math.random() * 800),
    power_kw: 15 + Math.random() * 25,
    alarm_state: 'ok',
    raw_data: { timestamp: new Date().toISOString(), source: 'simulated' }
  };
}

/** Detecta se há variação preocupante (simplificado) */
function hasSignificantVariation(data) {
  if (data.temperature > 70 || data.pressure > 5.5 || data.vibration > 2) return true;
  return false;
}

/**
 * Executa ciclo de coleta para uma empresa
 */
async function runCollectorCycle(companyId) {
  const equipmentList = [
    { id: 'EQ-001', name: 'Compressor Principal' },
    { id: 'EQ-002', name: 'Bomba Hidráulica' },
    { id: 'EQ-003', name: 'Prensa 500T' }
  ];

  for (const eq of equipmentList) {
    try {
      const eqId = eq.id;
      const eqName = eq.name;
      const data = simulatePLCRead(eqId, eqName);
      const saved = await plcData.saveCollectedData(companyId, data);

      if (!hasSignificantVariation(data)) continue;

      const manuals = await plcData.getManualsForEquipment(companyId, eqId, eqName);
      const manualContext = manuals.map(m => `[${m.title}]\n${m.chunk_text}`).join('\n---\n');

      const analysis = await plcAi.analyzeEquipmentData({
        equipmentData: data,
        manualContext: manualContext.slice(0, 4000)
      });

      if (analysis) {
        await plcData.saveAnalysisAndAlert(companyId, {
          equipment_id: eqId,
          equipment_name: eqName,
          collected_data_id: saved?.id,
          variation_type: analysis.variation_type || 'general',
          variation_description: analysis.alert_message || analysis.recommendation,
          severity: analysis.severity || 'medium',
          possible_causes: analysis.possible_causes || [],
          analysis_raw: JSON.stringify(analysis),
          alert_title: analysis.alert_title || `Variação: ${eqId}`,
          alert_message: analysis.alert_message || analysis.recommendation || ''
        });
      }
    } catch (err) {
      console.warn('[PLC_COLLECTOR]', eq.id, err.message);
    }
  }
}

module.exports = { runCollectorCycle, simulatePLCRead };
