'use strict';

/**
 * GÊMEO DIGITAL APLICADO — Memória Industrial
 *
 * Aprendizado contínuo: registra falhas, soluções e efetividade.
 * Usado pelo motor de diagnóstico para melhorar predições futuras.
 */

const db = require('../db');

/**
 * Busca entradas de memória relevantes (falhas similares).
 */
async function search(companyId, { machineId, failureType, component, limit = 10 } = {}) {
  const conditions = ['company_id = $1'];
  const params = [companyId];
  let idx = 2;

  if (machineId) {
    conditions.push(`(machine_id = $${idx} OR machine_id IS NULL)`);
    params.push(machineId);
    idx++;
  }
  if (failureType) {
    conditions.push(`failure_type ILIKE $${idx}`);
    params.push(`%${failureType}%`);
    idx++;
  }
  if (component) {
    conditions.push(`component ILIKE $${idx}`);
    params.push(`%${component}%`);
    idx++;
  }

  const r = await db.query(
    `SELECT id, machine_id, failure_type, component, root_cause,
            solution_applied, repair_time_minutes, effectiveness, tags, created_at
     FROM digital_twin_memory
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC LIMIT $${idx}`,
    [...params, limit]
  );
  return r.rows || [];
}

/**
 * Estatísticas de memória para dashboard.
 */
async function getStats(companyId) {
  try {
    const r = await db.query(`
      SELECT
        COUNT(*)::int AS total_entries,
        COUNT(DISTINCT component)::int AS unique_components,
        COUNT(DISTINCT failure_type)::int AS unique_failure_types,
        COUNT(*) FILTER (WHERE effectiveness = 'effective')::int AS effective_solutions,
        COUNT(*) FILTER (WHERE effectiveness = 'ineffective')::int AS ineffective_solutions,
        COALESCE(AVG(repair_time_minutes) FILTER (WHERE repair_time_minutes IS NOT NULL), 0)::int AS avg_repair_minutes,
        COUNT(DISTINCT machine_id)::int AS machines_with_history
      FROM digital_twin_memory WHERE company_id = $1
    `, [companyId]);
    return r.rows[0] || {};
  } catch {
    return {};
  }
}

/**
 * Top falhas mais frequentes (para heatmap / relatórios).
 */
async function topFailures(companyId, limit = 10) {
  try {
    const r = await db.query(`
      SELECT component, failure_type, COUNT(*)::int AS occurrences,
             COALESCE(AVG(repair_time_minutes), 0)::int AS avg_repair,
             MODE() WITHIN GROUP (ORDER BY effectiveness) AS common_effectiveness
      FROM digital_twin_memory WHERE company_id = $1
      GROUP BY component, failure_type
      ORDER BY occurrences DESC LIMIT $2
    `, [companyId, limit]);
    return r.rows || [];
  } catch {
    return [];
  }
}

module.exports = {
  search,
  getStats,
  topFailures
};
