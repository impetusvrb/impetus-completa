/**
 * IMPETUS - Ouvido Sensível - Monitoramento por áudio de máquinas
 */
const db = require('../db');

const AUDIO_MONITORING_ENABLED = process.env.AUDIO_MONITORING_ENABLED !== 'false';
const VOLUME_THRESHOLD_RATIO = 0.3;
const STABILITY_SAMPLES = 5;
const lastStateByProfile = new Map();

async function registerProfile(opts = {}) {
  const { companyId, equipamento, linha, profileData = {} } = opts;
  if (!companyId) return null;
  const existing = await db.query(`
    SELECT id FROM audio_machine_profiles
    WHERE company_id = $1 AND (equipamento IS NOT DISTINCT FROM $2) AND (linha IS NOT DISTINCT FROM $3) AND is_active = true LIMIT 1
  `, [companyId, equipamento || null, linha || null]);
  if (existing.rows?.[0]) {
    await db.query(`UPDATE audio_machine_profiles SET profile_data = $1, last_calibrated_at = now() WHERE id = $2`, [JSON.stringify(profileData), existing.rows[0].id]);
    return existing.rows[0];
  }
  const r = await db.query(`
    INSERT INTO audio_machine_profiles (company_id, equipamento, linha, profile_data, last_calibrated_at, is_active)
    VALUES ($1, $2, $3, $4, now(), true)
    RETURNING id
  `, [companyId, equipamento || null, linha || null, JSON.stringify(profileData)]);
  return r.rows?.[0] || null;
}

async function processSample(opts = {}) {
  if (!AUDIO_MONITORING_ENABLED) return {};
  const { companyId, profileId, equipamento, linha, volume = 0, metadata = {} } = opts;
  if (!companyId || volume == null) return {};
  let profile = null;
  if (profileId) {
    const pr = await db.query('SELECT id, profile_data FROM audio_machine_profiles WHERE id = $1 AND is_active = true', [profileId]);
    profile = pr.rows?.[0];
  } else if (equipamento || linha) {
    const pr = await db.query(`
      SELECT id, profile_data FROM audio_machine_profiles
      WHERE company_id = $1 AND is_active = true AND (equipamento IS NOT DISTINCT FROM $2) AND (linha IS NOT DISTINCT FROM $3)
      ORDER BY last_calibrated_at DESC LIMIT 1
    `, [companyId, equipamento || null, linha || null]);
    profile = pr.rows?.[0];
  }
  if (!profile) return {};
  const pid = profile.id;
  const baseline = (profile.profile_data || {}).baselineVolume || volume;
  const threshold = baseline * VOLUME_THRESHOLD_RATIO;
  let state = lastStateByProfile.get(pid) || { state: 'unknown', lowCount: 0, highCount: 0 };
  if (volume < threshold) {
    state.lowCount = (state.lowCount || 0) + 1;
    state.highCount = 0;
    if (state.lowCount >= STABILITY_SAMPLES && state.state !== 'parada') {
      state.state = 'parada';
      lastStateByProfile.set(pid, state);
      await recordEvent(companyId, 'maquina_parada', pid, equipamento, linha, metadata);
      return { eventRecorded: 'maquina_parada' };
    }
  } else {
    state.highCount = (state.highCount || 0) + 1;
    state.lowCount = 0;
    if (state.highCount >= STABILITY_SAMPLES && state.state === 'parada') {
      state.state = 'rodando';
      lastStateByProfile.set(pid, state);
      await recordEvent(companyId, 'maquina_reiniciada', pid, equipamento, linha, metadata);
      return { eventRecorded: 'maquina_reiniciada' };
    } else if (state.state === 'unknown') state.state = 'rodando';
  }
  lastStateByProfile.set(pid, state);
  return {};
}

async function recordEvent(companyId, eventType, profileId, equipamento, linha, metadata = {}) {
  if (!companyId || !eventType) return null;
  const eventTypes = ['maquina_parada', 'maquina_reiniciada', 'mudanca_som', 'alarme'];
  if (!eventTypes.includes(eventType)) return null;
  const r = await db.query(`
    INSERT INTO audio_detected_events (company_id, profile_id, event_type, equipamento, linha, metadata)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [companyId, profileId || null, eventType, equipamento || null, linha || null, JSON.stringify(metadata)]);
  const evId = r.rows?.[0]?.id;
  if (evId) {
    const desc = eventType === 'maquina_parada' ? 'Máquina parada detectada por áudio' : eventType === 'maquina_reiniciada' ? 'Máquina reiniciada detectada por áudio' : eventType;
    await db.query(`INSERT INTO eventos_empresa (company_id, tipo_evento, origem, equipamento, linha, descricao, metadata) VALUES ($1, $2, 'audio', $3, $4, $5, $6)`,
      [companyId, eventType, equipamento || null, linha || null, desc, JSON.stringify({ audio_event_id: evId })]);
  }
  return evId;
}

async function listProfiles(companyId) {
  if (!companyId) return [];
  const r = await db.query(`SELECT id, equipamento, linha, profile_data, last_calibrated_at FROM audio_machine_profiles WHERE company_id = $1 AND is_active = true ORDER BY equipamento, linha`, [companyId]);
  return r.rows || [];
}

async function listRecentEvents(companyId, limit = 50) {
  if (!companyId) return [];
  const r = await db.query(`SELECT id, event_type, equipamento, linha, metadata, created_at FROM audio_detected_events WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`, [companyId, limit]);
  return r.rows || [];
}

module.exports = { registerProfile, processSample, recordEvent, listProfiles, listRecentEvents, AUDIO_MONITORING_ENABLED };
