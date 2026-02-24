/**
 * Coletor de dados PLC (simulação OPC UA/Modbus)
 * Fluxo: coleta -> busca manuais -> IA analisa -> salva -> emite alerta
 */
const plcAi = require('./plcAi');
const plcData = require('./plcDataService');

/** Simula leitura de um equipamento */
function simulatePLCRead(equipmentId, equipmentName) {
  const base = { temperature: 45 + Math.random() * 30, pressure: 2 + Math.random() * 4, vibration: 0.5 + Math.random() * 2 };
  return {
    equipment_id: equipmentId,
    equipment_name: equipmentName,
    temperature: Math.round(base.temperature * 10) / 10,
    pressure: Math.round(base.pressure * 100) / 100,
    vibration: Math.round(base.vibration * 100) / 100,
    status: 'running',
    rpm: 1200 + Math.floor(Math.random() * 800),
    power_kw: 15 + Math.random() * 25,
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
