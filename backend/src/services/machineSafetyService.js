/**
 * Intervenções humanas em equipamentos — bloqueio de automação enquanto ativo.
 */
const db = require('../db');

async function listActiveInterventions(companyId) {
  if (!companyId) return [];
  try {
    const r = await db.query(
      `SELECT id, machine_identifier, machine_name, intervention_type, status, registered_at, technician_name
       FROM machine_human_interventions
       WHERE company_id = $1 AND status = 'active'
       ORDER BY registered_at DESC
       LIMIT 50`,
      [companyId]
    );
    return r.rows || [];
  } catch (err) {
    if (err?.code === '42P01') return [];
    console.warn('[machineSafety][listActiveInterventions]', err?.message ?? err);
    return [];
  }
}

async function isEquipmentUnderIntervention(companyId, machineIdentifier) {
  if (!companyId || !machineIdentifier) return false;
  try {
    const r = await db.query(
      `SELECT 1 FROM machine_human_interventions
       WHERE company_id = $1 AND machine_identifier = $2 AND status = 'active'
       LIMIT 1`,
      [companyId, machineIdentifier]
    );
    return (r.rows || []).length > 0;
  } catch (err) {
    if (err?.code === '42P01') return false;
    console.warn('[machineSafety][isEquipmentUnderIntervention]', err?.message ?? err);
    return false;
  }
}

module.exports = {
  listActiveInterventions,
  isEquipmentUnderIntervention
};
