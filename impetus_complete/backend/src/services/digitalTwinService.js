/**
 * IMPETUS - Digital Twin / Planta Digital
 * Enriquece mapa operacional com layout de planta e estados em cache
 * NÃO altera industrialOperationalMapService - consome e complementa
 */
const db = require('../db');
const industrialOperationalMap = require('./industrialOperationalMapService');

/**
 * Retorna estado do Digital Twin: mapa operacional + layout + estados em cache
 */
async function getTwinState(companyId) {
  const [factoryMap, layout, cachedStates] = await Promise.all([
    industrialOperationalMap.getFactoryMap(companyId),
    getLayout(companyId),
    getCachedStates(companyId)
  ]);

  const stateMap = {};
  for (const s of cachedStates) {
    stateMap[s.machine_identifier] = s.state_data || {};
  }

  const enrich = (m) => {
    const id = m.id?.toString?.() || m.machine_identifier || m.name;
    const cached = stateMap[id];
    return { ...m, twin_state: cached || {} };
  };

  const linhas = (factoryMap.linhas || []).map((l) => ({
    ...l,
    maquinas: (l.maquinas || []).map(enrich)
  }));

  const profiles = (factoryMap.profiles || []).map(enrich);

  return {
    ...factoryMap,
    linhas,
    profiles,
    layout: layout?.layout_data || {},
    svg_url: layout?.svg_url,
    cached_states: stateMap
  };
}

/**
 * Atualiza estado em cache para uma máquina (usado por PLC/Edge)
 */
async function updateMachineState(companyId, machineIdentifier, stateData) {
  await db.query(`
    INSERT INTO digital_twin_machine_states (company_id, machine_identifier, state_data)
    VALUES ($1, $2, $3)
    ON CONFLICT (company_id, machine_identifier) DO UPDATE SET
      state_data = EXCLUDED.state_data, updated_at = now()
  `, [companyId, machineIdentifier, JSON.stringify(stateData || {})]);
}

/**
 * Salva layout da planta
 */
async function saveLayout(companyId, { layout_data, svg_url }) {
  await db.query(`
    INSERT INTO plant_layout_config (company_id, layout_data, svg_url)
    VALUES ($1, $2, $3)
    ON CONFLICT (company_id) DO UPDATE SET
      layout_data = EXCLUDED.layout_data, svg_url = EXCLUDED.svg_url, updated_at = now()
  `, [companyId, JSON.stringify(layout_data || {}), svg_url || null]);
}

async function getLayout(companyId) {
  const r = await db.query(
    'SELECT layout_data, svg_url FROM plant_layout_config WHERE company_id = $1',
    [companyId]
  );
  return r.rows[0] || null;
}

async function getCachedStates(companyId) {
  const r = await db.query(
    'SELECT machine_identifier, state_data FROM digital_twin_machine_states WHERE company_id = $1',
    [companyId]
  );
  return r.rows || [];
}

module.exports = {
  getTwinState,
  updateMachineState,
  saveLayout
};
