/**
 * Stub - Detecção de Anomalias Operacionais
 * Implementação mínima para permitir o servidor subir
 */
const db = require('../db');

async function listAnomalies(companyId, opts = {}) {
  try {
    let q = 'SELECT * FROM operational_anomalies WHERE company_id = $1';
    const params = [companyId];
    if (opts.acknowledged !== undefined) {
      params.push(opts.acknowledged);
      q += ` AND acknowledged = $${params.length}`;
    }
    params.push(opts.limit || 50);
    q += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const r = await db.query(q, params);
    return r.rows || [];
  } catch {
    return [];
  }
}

async function getAlertsForUser(companyId, userId, hierarchyLevel) {
  return [];
}

async function acknowledgeAnomaly(companyId, anomalyId, userId) {
  try {
    await db.query(
      `UPDATE operational_anomalies SET acknowledged = true, acknowledged_at = now(), acknowledged_by = $3 WHERE id = $1 AND company_id = $2`,
      [anomalyId, companyId, userId]
    );
    return { ok: true };
  } catch (err) {
    throw err;
  }
}

module.exports = {
  listAnomalies,
  getAlertsForUser,
  acknowledgeAnomaly
};
