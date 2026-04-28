/**
 * IMPETUS - Mapa Operacional da Fábrica
 * Identifica máquinas conectadas, status, padrões, equipamentos offline
 * Atualizado continuamente pelo Machine Monitoring
 */
const db = require('../db');
const operationalKnowledgeMap = require('./operationalKnowledgeMapService');
const machineBrain = require('./machineBrainService');

const OFFLINE_THRESHOLD_MINUTES = 15; // sem dados há 15 min = offline

/**
 * Mapa completo: linhas, máquinas, status em tempo real, offline, previsões
 */
async function getFactoryMap(companyId) {
  const [knowledgeMap, profiles, lastReadings, recentEvents, interventions] = await Promise.all([
    operationalKnowledgeMap.getKnowledgeMap(companyId),
    machineBrain.listProfiles(companyId),
    getLastReadings(companyId),
    getRecentEvents(companyId),
    getActiveInterventions(companyId)
  ]);

  const offline = await getOfflineEquipment(companyId);
  const predictions = await getFailurePredictions(companyId);

  const machineStatusMap = {};
  for (const r of lastReadings) {
    const key = r.equipment_id || r.machine_identifier;
    machineStatusMap[key] = {
      status: r.status || 'unknown',
      temperature: r.temperature,
      vibration: r.vibration,
      pressure: r.pressure,
      rpm: r.rpm,
      last_read: r.collected_at,
      is_offline: offline.some((o) => o.machine_identifier === key)
    };
  }

  const interventionSet = new Set((interventions || []).map((i) => i.machine_identifier));

  const linhas = (knowledgeMap.linhas || []).map((l) => ({
    ...l,
    maquinas: (l.maquinas || []).map((m) => {
      const id = m.id?.toString?.() || m.name;
      const st = machineStatusMap[id] || {};
      return {
        ...m,
        status: st.status,
        is_offline: st.is_offline || false,
        under_intervention: interventionSet.has(id),
        last_read: st.last_read,
        temperature: st.temperature,
        vibration: st.vibration
      };
    })
  }));

  const profilesWithStatus = (profiles || []).map((p) => {
    const st = machineStatusMap[p.machine_identifier] || {};
    return {
      ...p,
      status: st.status,
      is_offline: st.is_offline || false,
      under_intervention: interventionSet.has(p.machine_identifier)
    };
  });

  return {
    linhas,
    equipamentos_soltos: knowledgeMap.equipamentos_soltos || [],
    responsaveis: knowledgeMap.responsaveis || [],
    profiles: profilesWithStatus,
    offline_equipment: offline,
    failure_predictions: predictions,
    recent_events: recentEvents,
    interventions_active: interventions || []
  };
}

async function getLastReadings(companyId) {
  try {
    const r = await db.query(`
      SELECT DISTINCT ON (equipment_id) equipment_id, equipment_name, temperature, pressure, vibration,
             status, rpm, oil_level, collected_at
      FROM plc_collected_data
      WHERE company_id = $1
      ORDER BY equipment_id, collected_at DESC
    `, [companyId]);
    return r.rows || [];
  } catch (err) {
    console.warn('[industrialOperationalMapService][last_readings]', err?.message ?? err);
    return [];
  }
}

async function getRecentEvents(companyId, limit = 20) {
  try {
    const r = await db.query(`
      SELECT event_type, machine_identifier, machine_name, severity, description, created_at
      FROM machine_detected_events
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [companyId, limit]);
    return r.rows || [];
  } catch (err) {
    console.warn('[industrialOperationalMapService][recent_events]', err?.message ?? err);
    return [];
  }
}

async function getActiveInterventions(companyId) {
  try {
    const r = await db.query(`
      SELECT machine_identifier, machine_name, technician_name, registered_at
      FROM machine_human_interventions
      WHERE company_id = $1 AND status = 'active'
    `, [companyId]);
    return r.rows || [];
  } catch (err) {
    console.warn('[industrialOperationalMapService][active_interventions]', err?.message ?? err);
    return [];
  }
}

/**
 * Equipamentos sem leitura recente
 */
async function getOfflineEquipment(companyId) {
  try {
    const profiles = await machineBrain.listProfiles(companyId);
    if (!profiles?.length) return [];

    const r = await db.query(`
      SELECT equipment_id, MAX(collected_at) as last_seen
      FROM plc_collected_data
      WHERE company_id = $1
      GROUP BY equipment_id
    `, [companyId]);

    const lastSeen = new Map((r.rows || []).map((x) => [x.equipment_id, x.last_seen]));
    const threshold = new Date(Date.now() - OFFLINE_THRESHOLD_MINUTES * 60 * 1000);

    return profiles.filter((p) => {
      const last = lastSeen.get(p.machine_identifier);
      return !last || new Date(last) < threshold;
    }).map((p) => ({
      machine_identifier: p.machine_identifier,
      machine_name: p.machine_name,
      last_seen: lastSeen.get(p.machine_identifier) || null
    }));
  } catch (err) {
    console.warn('[industrialOperationalMapService][offline_equipment]', err?.message ?? err);
    return [];
  }
}

/**
 * Previsões de falha (eventos predicted_failure recentes, tendências)
 */
async function getFailurePredictions(companyId, limit = 10) {
  try {
    const r = await db.query(`
      SELECT event_type, machine_identifier, machine_name, line_name, description, severity, sensor_values, created_at
      FROM machine_detected_events
      WHERE company_id = $1
        AND (event_type = 'predicted_failure' OR event_type IN ('overheating', 'vibration_alert', 'low_oil'))
        AND created_at > now() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT $2
    `, [companyId, limit]);
    return r.rows || [];
  } catch (err) {
    console.warn('[industrialOperationalMapService][failure_predictions]', err?.message ?? err);
    return [];
  }
}

module.exports = {
  getFactoryMap,
  getOfflineEquipment,
  getFailurePredictions,
  getLastReadings
};
