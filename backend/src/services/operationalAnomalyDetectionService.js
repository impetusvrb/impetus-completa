/**
 * Detecção e registo de anomalias operacionais (tenant-safe).
 * O despacho para a inbox ManuIA é opcional (MANUIA_DISPATCH_OPERATIONAL_ANOMALY) e corre após INSERT.
 */
'use strict';

const db = require('../db');

/**
 * Lista anomalias com filtros básicos.
 */
async function listAnomalies(companyId, opts = {}) {
  const limit = Math.min(Math.max(parseInt(opts.limit, 10) || 50, 1), 200);
  const params = [companyId];
  let p = 2;
  const cond = ['company_id = $1'];

  if (opts.since) {
    cond.push(`created_at >= $${p}`);
    params.push(opts.since);
    p += 1;
  }
  if (opts.until) {
    cond.push(`created_at <= $${p}`);
    params.push(opts.until);
    p += 1;
  }
  if (opts.anomaly_type) {
    cond.push(`anomaly_type = $${p}`);
    params.push(opts.anomaly_type);
    p += 1;
  }
  if (opts.acknowledged === true) cond.push('acknowledged = true');
  else if (opts.acknowledged === false) cond.push('acknowledged = false');

  params.push(limit);
  const limIdx = params.length;
  const r = await db.query(
    `
    SELECT * FROM operational_anomalies
    WHERE ${cond.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${limIdx}
  `,
    params
  );
  return r.rows || [];
}

/**
 * Alertas de anomalia direcionados ao utilizador.
 */
async function getAlertsForUser(companyId, userId, _hierarchyLevel) {
  const r = await db.query(
    `
    SELECT a.*, ao.anomaly_type, ao.entity_name AS anomaly_entity_name, ao.severity AS anomaly_severity
    FROM operational_anomaly_alerts a
    LEFT JOIN operational_anomalies ao ON ao.id = a.anomaly_id
    WHERE a.company_id = $1 AND a.target_user_id = $2
    ORDER BY a.sent_at DESC NULLS LAST
    LIMIT 100
  `,
    [companyId, userId]
  );
  return r.rows || [];
}

/**
 * Reconhece anomalia e regista ações.
 */
async function acknowledgeAnomaly(anomalyId, userId, companyId, actions, resolutionNotes) {
  await db.query(
    `
    UPDATE operational_anomalies SET
      acknowledged = true,
      acknowledged_by = $3,
      acknowledged_at = now(),
      actions_taken = COALESCE($4::jsonb, '[]'::jsonb),
      resolution_notes = COALESCE($5, '')
    WHERE id = $1 AND company_id = $2
  `,
    [anomalyId, companyId, userId, JSON.stringify(Array.isArray(actions) ? actions : []), resolutionNotes || '']
  );
}

/**
 * Impacto agregado para BI / previsão.
 */
async function getAnomalyImpactForForecasting(companyId, days = 7) {
  const d = Math.min(Math.max(parseInt(days, 10) || 7, 1), 365);
  const r = await db.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
      COUNT(*) FILTER (WHERE severity = 'high')::int AS high
    FROM operational_anomalies
    WHERE company_id = $1 AND created_at >= now() - ($2::int * interval '1 day')
  `,
    [companyId, d]
  );
  const row = r.rows?.[0] || {};
  return {
    days: d,
    total_anomalies: row.total || 0,
    critical_count: row.critical || 0,
    high_count: row.high || 0
  };
}

/**
 * Persiste uma anomalia e agenda despacho ManuIA (se flags ativas).
 * Pode ser chamado por workers de deteção quando existir lógica de scoring.
 */
async function recordOperationalAnomaly(companyId, row = {}) {
  const raw =
    row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};
  const r = await db.query(
    `
    INSERT INTO operational_anomalies (
      company_id, anomaly_type, severity, entity_name, ai_analysis, raw_data,
      machine_identifier, line_name, entity_type, entity_id, affected_area
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `,
    [
      companyId,
      row.anomaly_type || 'maintenance_trigger',
      row.severity || 'medium',
      row.entity_name || null,
      row.ai_analysis || null,
      raw,
      row.machine_identifier || null,
      row.line_name || null,
      row.entity_type || null,
      row.entity_id || null,
      row.affected_area || null
    ]
  );
  const inserted = r.rows?.[0];
  if (inserted) {
    const eventDispatch = require('./manuiaApp/manuiaEventDispatchService');
    eventDispatch.scheduleDispatch('[MANUIA_DISPATCH_OPERATIONAL_ANOMALY]', () =>
      eventDispatch.dispatchFromOperationalAnomaly(companyId, inserted)
    );
  }
  return inserted;
}

/**
 * Ciclo de deteção (placeholder seguro: não gera ruído até existir motor de scoring).
 * Quando implementado, deve chamar recordOperationalAnomaly por deteção confirmada.
 */
async function runDetectionCycle(companyId) {
  if (!companyId) return { detected: 0, recorded: 0 };
  return { detected: 0, recorded: 0, companyId };
}

module.exports = {
  listAnomalies,
  getAlertsForUser,
  acknowledgeAnomaly,
  getAnomalyImpactForForecasting,
  recordOperationalAnomaly,
  runDetectionCycle
};
