'use strict';

const db = require('../db');
const governanceAlertService = require('./governanceAlertService');
const adaptiveGovernanceEngine = require('./adaptiveGovernanceEngine');

const INCIDENT_TYPES = new Set([
  'ALUCINACAO',
  'DADO_INCORRETO',
  'VIES',
  'COMPORTAMENTO_INADEQUADO',
  'UNKNOWN',
  'TENTATIVA_DE_INVASAO',
  'COMPLIANCE_RISK',
  'POLICY_VIOLATION'
]);
const STATUSES = new Set(['OPEN', 'UNDER_ANALYSIS', 'RESOLVED', 'FALSE_POSITIVE']);
const SEVERITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

function normType(t) {
  const u = String(t || 'UNKNOWN').toUpperCase();
  return INCIDENT_TYPES.has(u) ? u : 'UNKNOWN';
}

function severityForType(incidentType) {
  switch (incidentType) {
    case 'POLICY_VIOLATION':
      return 'MEDIUM';
    case 'COMPLIANCE_RISK':
      return 'HIGH';
    case 'TENTATIVA_DE_INVASAO':
      return 'CRITICAL';
    case 'ALUCINACAO':
      return 'HIGH';
    case 'COMPORTAMENTO_INADEQUADO':
      return 'HIGH';
    case 'VIES':
      return 'HIGH';
    case 'DADO_INCORRETO':
      return 'MEDIUM';
    default:
      return 'MEDIUM';
  }
}

async function resolveTraceIdForComplaint({ companyId, userId, preferredTraceId }) {
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (preferredTraceId && uuidRe.test(String(preferredTraceId))) {
    const r = await db.query(
      `SELECT trace_id FROM ai_interaction_traces
       WHERE trace_id = $1::uuid AND company_id = $2 LIMIT 1`,
      [preferredTraceId, companyId]
    );
    if (r.rows[0]) return r.rows[0].trace_id;
  }
  const r2 = await db.query(
    `SELECT trace_id FROM ai_interaction_traces
     WHERE company_id = $1 AND user_id = $2
     ORDER BY created_at DESC NULLS LAST LIMIT 1`,
    [companyId, userId]
  );
  return r2.rows[0]?.trace_id || null;
}

async function createIncident({
  traceId,
  userId,
  companyId,
  incidentType,
  userComment,
  severity
}) {
  const type = normType(incidentType);
  const sev = SEVERITIES.has(String(severity || '').toUpperCase())
    ? String(severity).toUpperCase()
    : severityForType(type);

  const r = await db.query(
    `INSERT INTO ai_incidents (
       trace_id, user_id, company_id, incident_type, user_comment, status, severity
     ) VALUES ($1::uuid, $2, $3, $4, $5, 'OPEN', $6)
     RETURNING *`,
    [traceId, userId || null, companyId, type, userComment != null ? String(userComment).slice(0, 50000) : null, sev]
  );
  const created = r.rows[0];
  governanceAlertService.onIncidentCreated(created).catch((err) => {
    console.error('[GOVERNANCE_ALERT_ON_CREATE]', err?.message || err);
  });
  adaptiveGovernanceEngine.invalidateAfterFeedback(companyId, userId || null);
  return created;
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    trace_id: row.trace_id,
    user_id: row.user_id,
    company_id: row.company_id,
    incident_type: row.incident_type,
    user_comment: row.user_comment,
    status: row.status,
    severity: row.severity,
    resolution_note: row.resolution_note,
    resolved_at: row.resolved_at,
    resolved_by_admin_user_id: row.resolved_by_admin_user_id,
    resolved_by_impetus_admin_id: row.resolved_by_impetus_admin_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function listForCompany(companyId, limit = 100) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const r = await db.query(
    `SELECT i.*, u.name AS reporter_name, u.email AS reporter_email
     FROM ai_incidents i
     LEFT JOIN users u ON u.id = i.user_id
     WHERE i.company_id = $1
     ORDER BY i.created_at DESC
     LIMIT $2`,
    [companyId, lim]
  );
  return r.rows.map((row) => ({
    ...mapRow(row),
    reporter: row.reporter_name
      ? { name: row.reporter_name, email: row.reporter_email }
      : null
  }));
}

async function listGlobal(limit = 200, companyIdFilter = null) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 1000);
  if (companyIdFilter) {
    const r = await db.query(
      `SELECT i.*, u.name AS reporter_name, u.email AS reporter_email,
              c.name AS company_name, c.razao_social AS company_razao
       FROM ai_incidents i
       LEFT JOIN users u ON u.id = i.user_id
       LEFT JOIN companies c ON c.id = i.company_id
       WHERE i.company_id = $1
       ORDER BY i.created_at DESC
       LIMIT $2`,
      [companyIdFilter, lim]
    );
    return r.rows.map((row) => ({
      ...mapRow(row),
      reporter: row.reporter_name
        ? { name: row.reporter_name, email: row.reporter_email }
        : null,
      company: {
        id: row.company_id,
        name: row.company_name || row.company_razao || null
      }
    }));
  }
  const r = await db.query(
    `SELECT i.*, u.name AS reporter_name, u.email AS reporter_email,
            c.name AS company_name, c.razao_social AS company_razao
     FROM ai_incidents i
     LEFT JOIN users u ON u.id = i.user_id
     LEFT JOIN companies c ON c.id = i.company_id
     ORDER BY i.created_at DESC
     LIMIT $1`,
    [lim]
  );
  return r.rows.map((row) => ({
    ...mapRow(row),
    reporter: row.reporter_name
      ? { name: row.reporter_name, email: row.reporter_email }
      : null,
    company: {
      id: row.company_id,
      name: row.company_name || row.company_razao || null
    }
  }));
}

async function getByIdForCompany(id, companyId) {
  const r = await db.query(
    `SELECT i.*, u.name AS reporter_name, u.email AS reporter_email
     FROM ai_incidents i
     LEFT JOIN users u ON u.id = i.user_id
     WHERE i.id = $1::uuid AND i.company_id = $2`,
    [id, companyId]
  );
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  return {
    ...mapRow(row),
    reporter: row.reporter_name
      ? { name: row.reporter_name, email: row.reporter_email }
      : null
  };
}

async function getByIdGlobal(id) {
  const r = await db.query(
    `SELECT i.*, u.name AS reporter_name, u.email AS reporter_email,
            c.name AS company_name, c.razao_social AS company_razao
     FROM ai_incidents i
     LEFT JOIN users u ON u.id = i.user_id
     LEFT JOIN companies c ON c.id = i.company_id
     WHERE i.id = $1::uuid`,
    [id]
  );
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  return {
    ...mapRow(row),
    reporter: row.reporter_name
      ? { name: row.reporter_name, email: row.reporter_email }
      : null,
    company: {
      id: row.company_id,
      name: row.company_name || row.company_razao || null
    }
  };
}

async function fetchTraceSnapshot(traceId, companyId) {
  const r = await db.query(
    `SELECT trace_id, module_name, input_payload, output_response, model_info, created_at, user_id
     FROM ai_interaction_traces
     WHERE trace_id = $1::uuid AND company_id = $2`,
    [traceId, companyId]
  );
  if (!r.rows[0]) return null;
  const t = r.rows[0];
  let out = t.output_response;
  if (typeof out === 'string') {
    try {
      out = JSON.parse(out);
    } catch (err) {
      console.warn('[aiIncidentService][output_response_parse]', err?.message ?? err);
      out = {};
    }
  }
  const explanation_layer =
    out && typeof out === 'object' ? out.explanation_layer || out.output?.explanation_layer : null;
  const data_lineage =
    t.input_payload && typeof t.input_payload === 'object'
      ? t.input_payload.data_lineage
      : null;
  return {
    trace_id: t.trace_id,
    module_name: t.module_name,
    created_at: t.created_at,
    user_id: t.user_id,
    input_payload: t.input_payload,
    output_response: t.output_response,
    model_info: t.model_info,
    explanation_layer: explanation_layer || null,
    data_lineage: Array.isArray(data_lineage) ? data_lineage : []
  };
}

async function fetchTraceSnapshotGlobal(traceId) {
  const r = await db.query(
    `SELECT trace_id, company_id, module_name, input_payload, output_response, model_info, created_at, user_id
     FROM ai_interaction_traces
     WHERE trace_id = $1::uuid`,
    [traceId]
  );
  if (!r.rows[0]) return null;
  const t = r.rows[0];
  const inner = await fetchTraceSnapshot(traceId, t.company_id);
  return inner ? { ...inner, company_id: t.company_id } : null;
}

async function updateByCompanyAdmin(id, companyId, { status, resolution_note }, adminUserId) {
  const st = String(status || '').toUpperCase();
  if (!STATUSES.has(st)) {
    const e = new Error('Status inválido');
    e.code = 'INVALID_STATUS';
    throw e;
  }
  const prev = await getByIdForCompany(id, companyId);
  if (!prev) return null;

  const note = resolution_note != null ? String(resolution_note).slice(0, 20000) : null;
  const resolved = st === 'RESOLVED' || st === 'FALSE_POSITIVE';

  const r = await db.query(
    `UPDATE ai_incidents SET
       status = $3,
       resolution_note = COALESCE($4, resolution_note),
       resolved_at = CASE WHEN $5 THEN COALESCE(resolved_at, now()) ELSE resolved_at END,
       resolved_by_admin_user_id = CASE WHEN $5 THEN $6 ELSE resolved_by_admin_user_id END,
       resolved_by_impetus_admin_id = CASE WHEN $5 THEN NULL ELSE resolved_by_impetus_admin_id END,
       updated_at = now()
     WHERE id = $1::uuid AND company_id = $2
     RETURNING *`,
    [id, companyId, st, note, resolved, adminUserId || null]
  );
  return r.rows[0] ? { previous: prev, current: mapRow(r.rows[0]) } : null;
}

async function updateByImpetusAdmin(id, { status, resolution_note }, impetusAdminId) {
  const st = String(status || '').toUpperCase();
  if (!STATUSES.has(st)) {
    const e = new Error('Status inválido');
    e.code = 'INVALID_STATUS';
    throw e;
  }
  const prev = await getByIdGlobal(id);
  if (!prev) return null;
  const note = resolution_note != null ? String(resolution_note).slice(0, 20000) : null;
  const resolved = st === 'RESOLVED' || st === 'FALSE_POSITIVE';

  const r = await db.query(
    `UPDATE ai_incidents SET
       status = $2,
       resolution_note = COALESCE($3, resolution_note),
       resolved_at = CASE WHEN $4 THEN COALESCE(resolved_at, now()) ELSE resolved_at END,
       resolved_by_impetus_admin_id = CASE WHEN $4 THEN $5 ELSE resolved_by_impetus_admin_id END,
       updated_at = now()
     WHERE id = $1::uuid
     RETURNING *`,
    [id, st, note, resolved, impetusAdminId || null]
  );
  return r.rows[0] ? { previous: prev, current: mapRow(r.rows[0]) } : null;
}

/**
 * Estatísticas para gráfico de saúde (volume por semana).
 */
async function statsWeekly({ companyId = null, days = 90 } = {}) {
  const d = Math.min(Math.max(parseInt(days, 10) || 90, 7), 365);
  const r = companyId
    ? await db.query(
        `SELECT
           date_trunc('week', created_at AT TIME ZONE 'UTC')::date AS week_start,
           count(*)::int AS created_cnt
         FROM ai_incidents
         WHERE company_id = $1
           AND created_at >= now() - ($2::int * interval '1 day')
         GROUP BY 1
         ORDER BY 1 ASC`,
        [companyId, d]
      )
    : await db.query(
        `SELECT
           date_trunc('week', created_at AT TIME ZONE 'UTC')::date AS week_start,
           count(*)::int AS created_cnt
         FROM ai_incidents
         WHERE created_at >= now() - ($1::int * interval '1 day')
         GROUP BY 1
         ORDER BY 1 ASC`,
        [d]
      );

  const s = companyId
    ? await db.query(
        `SELECT
           count(*) FILTER (WHERE status = 'OPEN')::int AS open,
           count(*) FILTER (WHERE status = 'UNDER_ANALYSIS')::int AS under_analysis,
           count(*) FILTER (WHERE status IN ('RESOLVED', 'FALSE_POSITIVE'))::int AS closed,
           count(*)::int AS total
         FROM ai_incidents
         WHERE company_id = $1`,
        [companyId]
      )
    : await db.query(
        `SELECT
           count(*) FILTER (WHERE status = 'OPEN')::int AS open,
           count(*) FILTER (WHERE status = 'UNDER_ANALYSIS')::int AS under_analysis,
           count(*) FILTER (WHERE status IN ('RESOLVED', 'FALSE_POSITIVE'))::int AS closed,
           count(*)::int AS total
         FROM ai_incidents`
      );

  return {
    series: r.rows.map((row) => ({
      week: row.week_start,
      created: row.created_cnt
    })),
    summary: s.rows[0] || { open: 0, under_analysis: 0, closed: 0, total: 0 }
  };
}

module.exports = {
  resolveTraceIdForComplaint,
  createIncident,
  listForCompany,
  listGlobal,
  getByIdForCompany,
  getByIdGlobal,
  fetchTraceSnapshot,
  fetchTraceSnapshotGlobal,
  updateByCompanyAdmin,
  updateByImpetusAdmin,
  statsWeekly,
  normType,
  severityForType
};
