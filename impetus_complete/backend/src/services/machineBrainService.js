/**
 * IMPETUS - Machine Brain
 * Armazena histórico, aprende padrões normais, identifica anomalias, prevíe falhas
 */
const db = require('../db');
const plcData = require('./plcDataService');

const ANOMALY_DEVIATION = 0.25; // 25% fora do padrão = anomalia
const MIN_SAMPLES_FOR_PROFILE = 20;
const PROFILE_TYPES = ['plc', 'asset', 'production_line_machine'];

function isAnomaly(value, avg, minVal, maxVal) {
  if (value == null || avg == null) return false;
  const range = (maxVal ?? avg * 1.3) - (minVal ?? avg * 0.7);
  if (range <= 0) return Math.abs(value - avg) > avg * 0.2;
  const dev = Math.abs(value - avg);
  return dev > range * ANOMALY_DEVIATION;
}

/**
 * Atualiza perfil operacional com nova leitura
 */
async function updateProfile(companyId, machineId, machineName, lineName, reading) {
  const r = await db.query(`
    SELECT * FROM machine_operational_profiles
    WHERE company_id = $1 AND machine_identifier = $2
  `, [companyId, machineId]);

  const temp = reading.temperature ?? reading.motor_temperature;
  const vib = reading.vibration ?? reading.vibration_level;
  const press = reading.pressure ?? reading.hydraulic_pressure;
  const curr = reading.electrical_current ?? (reading.power_kw ? reading.power_kw * 1000 / 380 : null);
  const rpmVal = reading.rpm;

  if (r.rows?.length) {
    const p = r.rows[0];
    const n = (p.sample_count || 0) + 1;
    const f = 1 / n;
    const tAvg = p.temperature_avg != null ? p.temperature_avg * (1 - f) + (temp ?? p.temperature_avg) * f : temp;
    const vAvg = p.vibration_avg != null ? p.vibration_avg * (1 - f) + (vib ?? p.vibration_avg) * f : vib;
    const prAvg = p.pressure_avg != null ? p.pressure_avg * (1 - f) + (press ?? p.pressure_avg) * f : press;
    const rpmAvg = p.rpm_avg != null ? p.rpm_avg * (1 - f) + (rpmVal ?? p.rpm_avg) * f : rpmVal;

    await db.query(`
      UPDATE machine_operational_profiles SET
        temperature_avg = $3, temperature_min = LEAST(COALESCE(temperature_min, 999), COALESCE($4, 999)),
        temperature_max = GREATEST(COALESCE(temperature_max, -999), COALESCE($4, -999)),
        vibration_avg = $5, vibration_max = GREATEST(COALESCE(vibration_max, -999), COALESCE($6, -999)),
        pressure_avg = $7, pressure_min = LEAST(COALESCE(pressure_min, 999), COALESCE($8, 999)),
        pressure_max = GREATEST(COALESCE(pressure_max, -999), COALESCE($8, -999)),
        electrical_current_avg = COALESCE(electrical_current_avg, $9),
        rpm_avg = $10, sample_count = $11, last_calibrated_at = now(), updated_at = now()
      WHERE company_id = $1 AND machine_identifier = $2
    `, [companyId, machineId, tAvg, temp, vAvg, vib, prAvg, press, curr, rpmAvg, n]);
  } else {
    await db.query(`
      INSERT INTO machine_operational_profiles (
        company_id, machine_identifier, machine_name, line_name,
        temperature_avg, temperature_min, temperature_max,
        vibration_avg, vibration_max, pressure_avg, pressure_min, pressure_max,
        electrical_current_avg, rpm_avg, sample_count, last_calibrated_at
      ) VALUES ($1, $2, $3, $4, $5, $5, $5, $6, $6, $7, $7, $7, $8, $9, 1, now())
    `, [companyId, machineId, machineName, lineName, temp, vib, press, curr, rpmVal]);
  }
}

/**
 * Analisa leitura e detecta anomalias/eventos
 */
async function analyzeReading(companyId, machineId, machineName, lineName, reading) {
  const events = [];
  const status = reading.status ?? reading.machine_status;

  if (status === 'stopped' || status === 'off') {
    events.push({ event_type: 'machine_stopped', severity: 'medium' });
  }
  if (status === 'running' || status === 'on') {
    const last = await getLastStatus(companyId, machineId);
    if (last && last !== 'running') events.push({ event_type: 'machine_started', severity: 'low' });
  }

  const r = await db.query(`
    SELECT * FROM machine_operational_profiles
    WHERE company_id = $1 AND machine_identifier = $2
  `, [companyId, machineId]);

  const profile = r.rows?.[0];
  const sampleCount = profile?.sample_count ?? 0;

  if (sampleCount >= MIN_SAMPLES_FOR_PROFILE) {
    const temp = reading.temperature ?? reading.motor_temperature;
    const vib = reading.vibration ?? reading.vibration_level;
    const press = reading.pressure ?? reading.hydraulic_pressure;
    const oilLevel = reading.oil_level;

    if (temp != null && isAnomaly(temp, profile.temperature_avg, profile.temperature_min, profile.temperature_max)) {
      if (temp > (profile.temperature_max || profile.temperature_avg * 1.2)) {
        events.push({ event_type: 'overheating', severity: 'high', sensor_values: { temperature: temp } });
      } else {
        events.push({ event_type: 'anomaly_detected', severity: 'medium', sensor_values: { temperature: temp } });
      }
    }
    if (vib != null && (profile.vibration_max && vib > profile.vibration_max * 1.3)) {
      events.push({ event_type: 'vibration_alert', severity: 'high', sensor_values: { vibration: vib } });
    }
    if (oilLevel != null && oilLevel < 20) {
      events.push({ event_type: 'low_oil', severity: 'high', sensor_values: { oil_level: oilLevel } });
    }
  }

  return events;
}

async function getLastStatus(companyId, machineId) {
  const r = await db.query(`
    SELECT status FROM plc_collected_data
    WHERE company_id = $1 AND equipment_id = $2
    ORDER BY collected_at DESC LIMIT 1
  `, [companyId, machineId]);
  return r.rows?.[0]?.status;
}

/**
 * Registra evento detectado
 */
async function registerEvent(companyId, machineId, machineName, lineName, event) {
  const r = await db.query(`
    INSERT INTO machine_detected_events (company_id, event_type, machine_identifier, machine_name, line_name, description, severity, sensor_values)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, company_id, event_type, severity, description, machine_name, machine_identifier, line_name
  `, [
    companyId,
    event.event_type,
    machineId,
    machineName,
    lineName,
    event.description || getEventDescription(event.event_type),
    event.severity || 'medium',
    JSON.stringify(event.sensor_values || {})
  ]);
  return r.rows?.[0];
}

function getEventDescription(type) {
  const map = {
    machine_started: 'Máquina iniciada',
    machine_stopped: 'Máquina parada',
    low_oil: 'Nível de óleo baixo',
    overheating: 'Superaquecimento detectado',
    vibration_alert: 'Alerta de vibração',
    abnormal_noise: 'Ruído anormal',
    power_failure: 'Falha de energia',
    compressor_offline: 'Compressor offline',
    pressure_low: 'Pressão baixa',
    pressure_high: 'Pressão alta',
    anomaly_detected: 'Anomalia detectada',
    predicted_failure: 'Previsão de falha'
  };
  return map[type] || type;
}

/**
 * Retorna perfil operacional da máquina
 */
async function getProfile(companyId, machineId) {
  const r = await db.query(`
    SELECT * FROM machine_operational_profiles
    WHERE company_id = $1 AND machine_identifier = $2
  `, [companyId, machineId]);
  return r.rows?.[0];
}

async function listProfiles(companyId) {
  const r = await db.query(`
    SELECT * FROM machine_operational_profiles
    WHERE company_id = $1
    ORDER BY machine_name, line_name
  `, [companyId]);
  return r.rows || [];
}

module.exports = {
  updateProfile,
  analyzeReading,
  registerEvent,
  getProfile,
  listProfiles
};
