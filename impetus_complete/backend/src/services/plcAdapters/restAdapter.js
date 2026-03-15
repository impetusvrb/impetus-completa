/**
 * IMPETUS - Adapter REST para leitura de gateways industriais
 * Usa axios (já no projeto). data_source_config: { url, gateway_url, api_key, method }
 * Mapeamento opcional de campos via mapping_config
 */
const axios = require('axios');

/**
 * @param {Object} cfg - data_source_config
 * @param {string} equipmentId
 * @param {string} equipmentName
 * @returns {Promise<Object>}
 */
async function read(cfg, equipmentId, equipmentName) {
  const url = cfg.url || cfg.gateway_url || cfg.endpoint;
  if (!url) throw new Error('REST adapter: url ou gateway_url obrigatório');

  const fullUrl = url.includes('${') ? url.replace(/\$\{machine_id\}/g, equipmentId) : url;
  const method = (cfg.method || 'GET').toUpperCase();
  const headers = {};
  if (cfg.api_key) headers['X-API-Key'] = cfg.api_key;
  if (cfg.authorization) headers['Authorization'] = cfg.authorization;

  const res = await axios.request({
    url: fullUrl,
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    timeout: cfg.timeout || 5000,
    params: method === 'GET' && cfg.params ? cfg.params : undefined
  });

  const raw = res?.data;
  if (!raw || typeof raw !== 'object') {
    return normalizeFromScalar(raw, equipmentId, equipmentName);
  }

  const mapping = cfg.mapping_config || cfg.registers || {};
  return {
    equipment_id: equipmentId,
    equipment_name: equipmentName,
    temperature: mapVal(raw, mapping.temperature || 'temperature', 'motor_temperature'),
    motor_temperature: mapVal(raw, mapping.motor_temperature || mapping.temperature),
    pressure: mapVal(raw, mapping.pressure, 'hydraulic_pressure'),
    hydraulic_pressure: mapVal(raw, mapping.hydraulic_pressure || mapping.pressure),
    vibration: mapVal(raw, mapping.vibration, 'vibration_level'),
    vibration_level: mapVal(raw, mapping.vibration_level || mapping.vibration),
    oil_level: mapVal(raw, mapping.oil_level),
    water_flow: mapVal(raw, mapping.water_flow),
    electrical_current: mapVal(raw, mapping.electrical_current),
    rpm: mapVal(raw, mapping.rpm),
    power_kw: mapVal(raw, mapping.power_kw),
    status: mapVal(raw, mapping.status, 'machine_status') || 'running',
    machine_status: mapVal(raw, mapping.machine_status || mapping.status) || 'running',
    alarm_state: mapVal(raw, mapping.alarm_state) || 'ok',
    raw_data: { timestamp: new Date().toISOString(), source: 'rest', raw: raw }
  };
}

function mapVal(obj, ...keys) {
  for (const k of keys) {
    if (!k) continue;
    const v = obj[k];
    if (v != null && v !== '') return typeof v === 'number' ? Number(v) : v;
  }
  return undefined;
}

function normalizeFromScalar(val, equipmentId, equipmentName) {
  return {
    equipment_id: equipmentId,
    equipment_name: equipmentName,
    temperature: typeof val === 'number' ? val : null,
    status: 'running',
    raw_data: { timestamp: new Date().toISOString(), source: 'rest', value: val }
  };
}

module.exports = { read };
