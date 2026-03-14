/**
 * IMPETUS - Factory de adapters PLC/Sensores
 * Suporta: modbus_tcp, modbus_rtu, opc_ua, rest, simulated
 * Fallback: simulação quando adapter indisponível ou config inválida
 */
const restAdapter = require('./restAdapter');

let modbusAdapter = null;
let opcuaAdapter = null;

try {
  modbusAdapter = require('./modbusAdapter');
} catch (e) {
  // modbus-serial não instalado - uso opcional
}

try {
  opcuaAdapter = require('./opcuaAdapter');
} catch (e) {
  // node-opcua não instalado - uso opcional
}

/**
 * Lê dados do equipamento conforme data_source_type e data_source_config
 * @param {Object} config - machine_monitoring_config (machine_identifier, machine_name, data_source_type, data_source_config)
 * @returns {Promise<Object|null>} reading ou null (fallback para simulação)
 */
async function read(config) {
  const type = (config.data_source_type || 'plc').toLowerCase();
  const cfg = config.data_source_config || {};
  const equipmentId = config.machine_identifier;
  const equipmentName = config.machine_name;

  if (type === 'simulated' || type === 'plc') {
    return null; // caller usa plcCollector.simulatePLCRead
  }

  if (type === 'modbus_tcp' || type === 'modbus_rtu') {
    if (modbusAdapter?.read) {
      try {
        const data = await modbusAdapter.read(cfg, equipmentId, equipmentName);
        if (data && (data.temperature != null || data.status != null || data.equipment_id)) {
          return data;
        }
      } catch (err) {
        console.warn('[PLC_ADAPTER] Modbus:', err?.message);
      }
    }
    return null;
  }

  if (type === 'opc_ua') {
    if (opcuaAdapter?.read) {
      try {
        const data = await opcuaAdapter.read(cfg, equipmentId, equipmentName);
        if (data && (data.temperature != null || data.status != null || data.equipment_id)) {
          return data;
        }
      } catch (err) {
        console.warn('[PLC_ADAPTER] OPC UA:', err?.message);
      }
    }
    return null;
  }

  if (type === 'rest' || cfg.url || cfg.gateway_url) {
    try {
      const data = await restAdapter.read(cfg, equipmentId, equipmentName);
      if (data && (data.temperature != null || data.status != null || data.equipment_id)) {
        return data;
      }
    } catch (err) {
      console.warn('[PLC_ADAPTER] REST:', err?.message);
    }
    return null;
  }

  return null;
}

module.exports = { read };
