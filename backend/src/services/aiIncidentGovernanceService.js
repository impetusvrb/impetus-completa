'use strict';

const db = require('../db');
const aiAnalyticsService = require('./aiAnalyticsService');
const governanceAlertService = require('./governanceAlertService');

function severityPriorityTier(sev) {
  const u = String(sev || '').toUpperCase();
  if (u === 'CRITICAL') return 1;
  if (u === 'HIGH') return 2;
  if (u === 'MEDIUM') return 3;
  return 4;
}

function incidentTypeBoost(incidentType) {
  const t = String(incidentType || '').toUpperCase();
  switch (t) {
    case 'TENTATIVA_DE_INVASAO':
      return 28;
    case 'VIES':
      return 18;
    case 'ALUCINACAO':
      return 12;
    case 'COMPORTAMENTO_INADEQUADO':
      return 14;
    case 'DADO_INCORRETO':
      return 8;
    default:
      return 5;
  }
}

function severityBaseScore(sev) {
  const u = String(sev || '').toUpperCase();
  if (u === 'CRITICAL') return 42;
  if (u === 'HIGH') return 32;
  if (u === 'MEDIUM') return 22;
  return 12;
}

/**
 * priority_tier: 1 = mais urgente (CRITICAL). priority_score: 0–100, maior = mais urgente.
 */
function computePriorityScore(severity, incidentType, companyIncidents7d) {
  const tier = severityPriorityTier(severity);
  const base = severityBaseScore(severity);
  const typeB = incidentTypeBoost(incidentType);
  const vol = Math.min((parseInt(companyIncidents7d, 10) || 0) * 3, 28);
  const raw = base + typeB + vol;
  const score = Math.min(100, Math.round(raw * 10) / 10);
  return { priority_tier: tier, priority_score: score };
}

function parseJsonMaybe(v) {
  if (v == null) return v;
  if (typeof v === 'object') return v;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return {};
    }
  }
  return {};
}

function extractExplanationAndLineage(inputPayload, outputResponse) {
  const out = parseJsonMaybe(outputResponse) || {};
  const explanation_layer =
    out && typeof out === 'object'
      ? out.explanation_layer || out.output?.explanation_layer || null
      : null;
  const inp = parseJsonMaybe(inputPayload) || {};
  const dl = inp.data_lineage;
  const data_lineage = Array.isArray(dl) ? dl : [];
  return { explanation_layer: explanation_layer || null, data_lineage };
}

function truncateText(s, max = 400) {
  if (s == null) return null;
  const t = String(s);
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function buildSummary(userComment, incidentType) {
  const c = userComment != null ? String(userComment).trim() : '';
  if (c) return truncateText(c, 320);
  return `${String(incidentType || 'UNKNOWN')} — sem comentário do utilizador`;
}

async function fetchGovernanceContextFlags() {
  const [crit, burst] = await Promise.all([
    db.query(
      `SELECT count(*)::int AS n
       FROM ai_incidents
       WHERE severity = 'CRITICAL'
         AND status NOT IN ('RESOLVED', 'FALSE_POSITIVE')`
    ),
    db.query(
      `SELECT i.company_id,
              COALESCE(c.name, c.razao_social, i.company_id::text) AS company_name,
              count(*)::int AS high_count_24h
       FROM ai_incidents i
       LEFT JOIN companies c ON c.id = i.company_id
       WHERE i.severity = 'HIGH'
         AND i.created_at >= now() - interval '24 hours'
       GROUP BY i.company_id, c.name, c.razao_social
       HAVING count(*) >= 3
       ORDER BY high_count_24h DESC
       LIMIT 30`
    )
  ]);
  return {
    critical_open_incidents: crit.rows[0]?.n || 0,
    companies_with_high_burst: burst.rows.map((r) => ({
      company_id: r.company_id,
      company_name: r.company_name,
      high_count_24h: r.high_count_24h
    }))
  };
}

/**
 * Lista global paginada com enriquecimento por trace (sem filtro tenant).
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function listGovernanceIncidents({
  page = 1,
  limit = 50,
  status = null,
  severity = null,
  incident_type = null,
  company_id = null
} = {}) {
  let companyFilter = company_id && UUID_RE.test(String(company_id)) ? String(company_id) : null;
  const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 50));
  const pg = Math.max(1, parseInt(page, 10) || 1);
  const offset = (pg - 1) * lim;

  const cond = [];
  const params = [];
  let p = 1;

  if (companyFilter) {
    cond.push(`i.company_id = $${p}::uuid`);
    params.push(companyFilter);
    p++;
  }
  if (status) {
    cond.push(`i.status = $${p}`);
    params.push(String(status).toUpperCase());
    p++;
  }
  if (severity) {
    cond.push(`i.severity = $${p}`);
    params.push(String(severity).toUpperCase());
    p++;
  }
  if (incident_type) {
    cond.push(`i.incident_type = $${p}`);
    params.push(String(incident_type).toUpperCase());
    p++;
  }

  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

  const countR = await db.query(
    `SELECT count(*)::int AS total FROM ai_incidents i ${where}`,
    params
  );
  const total = countR.rows[0]?.total || 0;

  const listParams = [...params, lim, offset];
  const limIdx = p;
  const offIdx = p + 1;

  const r = await db.query(
    `WITH company_week AS (
       SELECT company_id, count(*)::int AS cnt
       FROM ai_incidents
       WHERE created_at >= now() - interval '7 days'
       GROUP BY company_id
     )
     SELECT
       i.id AS incident_id,
       i.company_id,
       COALESCE(c.name, c.razao_social) AS company_name,
       i.user_id,
       i.incident_type,
       i.severity,
       i.status,
       i.created_at,
       i.trace_id,
       i.user_comment,
       t.module_name,
       t.model_info,
       t.input_payload,
       t.output_response,
       t.human_validation_status,
       t.validation_evidence,
       COALESCE(cw.cnt, 0)::int AS company_incidents_7d
     FROM ai_incidents i
     LEFT JOIN companies c ON c.id = i.company_id
     LEFT JOIN ai_interaction_traces t ON t.trace_id = i.trace_id
     LEFT JOIN company_week cw ON cw.company_id = i.company_id
     ${where}
     ORDER BY
       CASE i.severity
         WHEN 'CRITICAL' THEN 1
         WHEN 'HIGH' THEN 2
         WHEN 'MEDIUM' THEN 3
         ELSE 4
       END,
       i.created_at DESC
     LIMIT $${limIdx} OFFSET $${offIdx}`,
    listParams
  );

  const governance_alerts = await fetchGovernanceContextFlags();

  const items = r.rows.map((row) => {
    const rowDec = aiAnalyticsService.hydrateTracePayloadsForRead(row);
    const { explanation_layer, data_lineage } = extractExplanationAndLineage(
      rowDec.input_payload,
      rowDec.output_response
    );
    const { priority_tier, priority_score } = computePriorityScore(
      row.severity,
      row.incident_type,
      row.company_incidents_7d
    );
    return {
      incident_id: row.incident_id,
      company_id: row.company_id,
      company_name: row.company_name,
      user_id: row.user_id,
      incident_type: row.incident_type,
      severity: row.severity,
      status: row.status,
      created_at: row.created_at,
      trace_id: row.trace_id,
      summary: buildSummary(row.user_comment, row.incident_type),
      explanation_layer,
      data_lineage,
      human_validation_status: row.human_validation_status ?? null,
      validation_evidence: truncateText(rowDec.validation_evidence, 500),
      model_info: rowDec.model_info ?? null,
      module_name: row.module_name ?? null,
      priority_tier,
      priority_score
    };
  });

  return {
    items,
    page: pg,
    page_size: lim,
    total,
    governance_alerts
  };
}

async function getGovernanceMetrics() {
  const [
    totals,
    byType,
    bySeverity,
    last7,
    topCompanies,
    hitlProxy,
    critOpen,
    burst
  ] = await Promise.all([
    db.query(
      `SELECT
         count(*)::int AS total_incidents,
         count(*) FILTER (WHERE status NOT IN ('RESOLVED', 'FALSE_POSITIVE'))::int AS open_incidents
       FROM ai_incidents`
    ),
    db.query(
      `SELECT incident_type, count(*)::int AS n
       FROM ai_incidents
       GROUP BY incident_type
       ORDER BY n DESC`
    ),
    db.query(
      `SELECT severity, count(*)::int AS n
       FROM ai_incidents
       GROUP BY severity
       ORDER BY n DESC`
    ),
    db.query(
      `SELECT count(*)::int AS n
       FROM ai_incidents
       WHERE created_at >= now() - interval '7 days'`
    ),
    db.query(
      `SELECT i.company_id,
              COALESCE(c.name, c.razao_social, i.company_id::text) AS company_name,
              count(*)::int AS incident_count
       FROM ai_incidents i
       LEFT JOIN companies c ON c.id = i.company_id
       WHERE i.created_at >= now() - interval '7 days'
       GROUP BY i.company_id, c.name, c.razao_social
       ORDER BY incident_count DESC
       LIMIT 15`
    ),
    db.query(
      `SELECT
         count(*) FILTER (WHERE human_validation_status = 'ACCEPTED')::int AS accepted,
         count(*) FILTER (WHERE human_validation_status = 'REJECTED')::int AS rejected
       FROM ai_interaction_traces
       WHERE human_validation_status IN ('ACCEPTED', 'REJECTED')
         AND created_at >= now() - interval '30 days'`
    ),
    db.query(
      `SELECT count(*)::int AS n
       FROM ai_incidents
       WHERE severity = 'CRITICAL'
         AND status NOT IN ('RESOLVED', 'FALSE_POSITIVE')`
    ),
    db.query(
      `SELECT i.company_id,
              count(*)::int AS high_count_24h
       FROM ai_incidents i
       WHERE i.severity = 'HIGH'
         AND i.created_at >= now() - interval '24 hours'
       GROUP BY i.company_id
       HAVING count(*) >= 3
       ORDER BY high_count_24h DESC
       LIMIT 30`
    )
  ]);

  const accepted = hitlProxy.rows[0]?.accepted || 0;
  const rejected = hitlProxy.rows[0]?.rejected || 0;
  const decided = accepted + rejected;
  const ai_accuracy_proxy = {
    window_days: 30,
    accepted,
    rejected,
    decided_total: decided,
    rate_accepted: decided > 0 ? Math.round((accepted / decided) * 10000) / 10000 : null
  };

  const incidents_by_type = {};
  for (const row of byType.rows) {
    incidents_by_type[row.incident_type] = row.n;
  }
  const incidents_by_severity = {};
  for (const row of bySeverity.rows) {
    incidents_by_severity[row.severity] = row.n;
  }

  const critical_open = critOpen.rows[0]?.n || 0;
  const high_burst_companies = burst.rows.map((r) => ({
    company_id: r.company_id,
    high_count_24h: r.high_count_24h
  }));

  governanceAlertService.emitGovernanceScanAlert({
    critical_open,
    high_burst_companies
  });

  return {
    total_incidents: totals.rows[0]?.total_incidents || 0,
    open_incidents: totals.rows[0]?.open_incidents || 0,
    incidents_by_type,
    incidents_by_severity,
    incidents_last_7_days: last7.rows[0]?.n || 0,
    companies_most_affected: topCompanies.rows.map((r) => ({
      company_id: r.company_id,
      company_name: r.company_name,
      incident_count: r.incident_count
    })),
    ai_accuracy_proxy,
    governance_flags: {
      critical_open_incidents: critical_open,
      companies_with_high_burst: high_burst_companies
    }
  };
}

async function getGovernanceIncidentDetail(incidentId) {
  const r = await db.query(
    `SELECT i.*, u.name AS reporter_name, u.email AS reporter_email,
            c.name AS company_name, c.razao_social AS company_razao
     FROM ai_incidents i
     LEFT JOIN users u ON u.id = i.user_id
     LEFT JOIN companies c ON c.id = i.company_id
     WHERE i.id = $1::uuid`,
    [incidentId]
  );
  if (!r.rows[0]) return null;

  const row = r.rows[0];
  const incident = {
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
    updated_at: row.updated_at,
    reporter: row.reporter_name
      ? { name: row.reporter_name, email: row.reporter_email }
      : null,
    company: {
      id: row.company_id,
      name: row.company_name || row.company_razao || null
    }
  };

  const tq = await db.query(
    `SELECT trace_id, company_id, module_name, input_payload, output_response, model_info,
            created_at, user_id,
            human_validation_status, validation_modality, validation_evidence,
            validated_at, validation_audit
     FROM ai_interaction_traces
     WHERE trace_id = $1::uuid`,
    [row.trace_id]
  );
  const tRaw = tq.rows[0];
  const t = tRaw ? aiAnalyticsService.hydrateTracePayloadsForRead(tRaw) : null;
  let explanation_layer = null;
  let data_lineage = [];
  if (t) {
    const ex = extractExplanationAndLineage(t.input_payload, t.output_response);
    explanation_layer = ex.explanation_layer;
    data_lineage = ex.data_lineage;
  }

  const trace = t
    ? {
        trace_id: t.trace_id,
        company_id: t.company_id,
        module_name: t.module_name,
        input_payload: t.input_payload,
        output_response: t.output_response,
        explanation_layer,
        data_lineage,
        model_info: t.model_info,
        created_at: t.created_at,
        user_id: t.user_id
      }
    : null;

  const human_validation = t
    ? {
        status: t.human_validation_status ?? null,
        modality: t.validation_modality ?? null,
        evidence: t.validation_evidence ?? null,
        validated_at: t.validated_at ?? null
      }
    : {
        status: null,
        modality: null,
        evidence: null,
        validated_at: null
      };

  const audit_history = t?.validation_audit != null ? t.validation_audit : [];

  return { incident, trace, human_validation, audit_history };
}

module.exports = {
  listGovernanceIncidents,
  getGovernanceMetrics,
  getGovernanceIncidentDetail,
  computePriorityScore,
  severityPriorityTier
};
