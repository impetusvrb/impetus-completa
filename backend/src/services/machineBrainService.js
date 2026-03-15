/**
 * IMPETUS - Machine Brain (Cérebro Industrial)
 * Retorna perfis de equipamentos monitorados para mapa operacional, offline e Digital Twin.
 * Fontes: machine_monitoring_config, production_line_machines, plc_collected_data.
 * Não altera fluxos existentes - fallback seguro quando tabelas não existem.
 */
const db = require('../db');

/**
 * Lista perfis de equipamentos monitorados (machine_identifier, machine_name, line_name)
 * Usado por: industrialOperationalMapService, getOfflineEquipment
 */
async function listProfiles(companyId) {
  if (!companyId) return [];

  // 1. machine_monitoring_config (configuração explícita)
  try {
    const r1 = await db.query(`
      SELECT machine_identifier, machine_name, line_name
      FROM machine_monitoring_config
      WHERE company_id = $1 AND enabled = true
      ORDER BY line_name NULLS LAST, machine_identifier
    `, [companyId]);
    if (r1.rows?.length) return r1.rows;
  } catch (e) {
    if (!e.message?.includes('does not exist')) console.warn('[MACHINE_BRAIN] machine_monitoring_config:', e?.message);
  }

  // 2. Fallback: production_line_machines
  try {
    const r2 = await db.query(`
      SELECT plm.id::text as machine_identifier, plm.name as machine_name, pl.name as line_name
      FROM production_line_machines plm
      JOIN production_lines pl ON pl.id = plm.line_id
      WHERE pl.company_id = $1
      ORDER BY pl.name, plm.name
      LIMIT 100
    `, [companyId]);
    if (r2.rows?.length) return r2.rows;
  } catch (e) {
    if (!e.message?.includes('does not exist')) console.warn('[MACHINE_BRAIN] production_line_machines:', e?.message);
  }

  // 3. Fallback: equipamentos com leitura recente em plc_collected_data
  try {
    const r3 = await db.query(`
      SELECT DISTINCT equipment_id as machine_identifier, equipment_name as machine_name, NULL as line_name
      FROM plc_collected_data
      WHERE company_id = $1 AND equipment_id IS NOT NULL
        AND collected_at > now() - INTERVAL '7 days'
      ORDER BY equipment_id
      LIMIT 100
    `, [companyId]);
    return r3.rows || [];
  } catch (e) {
    if (!e.message?.includes('does not exist')) console.warn('[MACHINE_BRAIN] plc_collected_data:', e?.message);
    return [];
  }
}

module.exports = { listProfiles };
