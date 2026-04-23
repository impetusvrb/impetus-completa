'use strict';

/**
 * Compliance Reporting Engine — relatórios agregados, read-only, adequados a evidência LGPD / ISO 42001.
 * Não expõe payloads brutos nem PII; apenas contagens e distribuições.
 */

const db = require('../db');
const observabilityService = require('./observabilityService');
const aiLearningFeedbackService = require('./aiLearningFeedbackService');
const riskIntel = require('./riskIntelligenceService');

const MAX_RANGE_DAYS = Math.min(
  366,
  Math.max(1, parseInt(process.env.COMPLIANCE_REPORT_MAX_DAYS || '90', 10))
);

const REPORT_TYPES = new Set([
  'GOVERNANCE_SUMMARY',
  'COMPLIANCE_AUDIT',
  'RISK_ANALYSIS',
  'POLICY_EFFECTIVENESS'
]);

function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(s || '').trim()
  );
}

function anonymizeSubjectId(id) {
  if (!id) return null;
  const raw = String(id).replace(/-/g, '');
  return `SUBJECT_${raw.slice(0, 12)}`;
}

function anonymizeOrgId(id) {
  if (!id) return null;
  const raw = String(id).replace(/-/g, '');
  return `ORG_${raw.slice(0, 10)}`;
}

/**
 * @param {string} adminProfile
 * @param {string|null} companyIdParam
 * @returns {{ scope: 'global'|'company', company_id: string|null, error?: string }}
 */
function resolveAccessScope(adminProfile, companyIdParam) {
  const cid = companyIdParam != null && String(companyIdParam).trim() !== '' ? String(companyIdParam).trim() : null;
  if (adminProfile === 'super_admin') {
    if (!cid) return { scope: 'global', company_id: null };
    if (!isUuid(cid)) return { scope: 'global', company_id: null, error: 'company_id inválido' };
    return { scope: 'company', company_id: cid };
  }
  if (adminProfile === 'admin_comercial' || adminProfile === 'admin_suporte') {
    if (!cid || !isUuid(cid)) {
      return { scope: 'company', company_id: null, error: 'company_id obrigatório para este perfil' };
    }
    return { scope: 'company', company_id: cid };
  }
  return { scope: 'company', company_id: null, error: 'Perfil não autorizado a relatórios de conformidade' };
}

function parseDateParam(d) {
  const raw = String(d == null ? '' : d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00.000Z`);
  }
  return new Date(raw);
}

/**
 * @param {string|Date} period_start
 * @param {string|Date} period_end
 */
function parsePeriod(period_start, period_end) {
  const s = period_start instanceof Date ? period_start : parseDateParam(period_start);
  const e = period_end instanceof Date ? period_end : parseDateParam(period_end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return { error: 'period_start e period_end devem ser datas válidas (ISO 8601)' };
  }
  if (e < s) return { error: 'period_end deve ser >= period_start' };
  const spanDays = Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1;
  if (spanDays > MAX_RANGE_DAYS) {
    return { error: `Período máximo permitido: ${MAX_RANGE_DAYS} dias` };
  }
  return {
    start: s,
    endInclusive: e,
    endExclusive: new Date(e.getTime() + 86400000),
    span_days: spanDays
  };
}

async function queryTraceMetrics(companyId, start, endExclusive) {
  const params = [start, endExclusive];
  let filter = '';
  if (companyId) {
    params.push(companyId);
    filter = ` AND company_id = $3::uuid`;
  }
  const r = await db.query(
    `
    SELECT
      count(*)::int AS total_decisions,
      count(*) FILTER (WHERE human_validation_status = 'ACCEPTED')::int AS hitl_accepted,
      count(*) FILTER (WHERE human_validation_status = 'REJECTED')::int AS hitl_rejected,
      count(*) FILTER (
        WHERE human_validation_status IN ('PARTIALLY_ACCEPTED', 'ADJUSTED')
      )::int AS hitl_partial,
      count(*) FILTER (WHERE human_validation_status = 'PENDING')::int AS hitl_pending,
      count(*) FILTER (WHERE (data_classification->>'risk_level') IN ('HIGH', 'CRITICAL'))::int AS class_high_critical,
      count(*) FILTER (WHERE (data_classification->>'contains_sensitive_data') = 'true')::int AS class_sensitive_flag,
      count(*) FILTER (
        WHERE (model_info->'adaptive_governance'->>'response_mode') = 'limited'
      )::int AS mode_limited,
      count(*) FILTER (
        WHERE (model_info->'adaptive_governance'->>'response_mode') = 'restricted'
      )::int AS mode_restricted,
      count(*) FILTER (
        WHERE coalesce((model_info->'adaptive_governance'->>'allow_response')::text, 'true') = 'false'
      )::int AS adaptive_blocked,
      count(*) FILTER (
        WHERE (model_info->'policy_enforcement'->>'violation')::text = 'true'
      )::int AS policy_violation_trace,
      count(*) FILTER (
        WHERE (model_info->'policy_enforcement'->>'conflict_detected')::text = 'true'
      )::int AS policy_conflict_trace,
      count(*) FILTER (
        WHERE model_info @> '{"governance_tags": ["POLICY_VIOLATION"]}'::jsonb
      )::int AS tag_policy_violation,
      count(*) FILTER (
        WHERE model_info @> '{"governance_tags": ["COMPLIANCE_ANONYMIZED"]}'::jsonb
      )::int AS tag_compliance_anonymized,
      count(*) FILTER (
        WHERE model_info @> '{"governance_tags": ["ADAPTIVE_GOVERNANCE_BLOCK"]}'::jsonb
      )::int AS tag_adaptive_block
    FROM ai_interaction_traces
    WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
    ${filter}
    `,
    params
  );
  return r.rows[0] || {};
}

async function queryIncidentsBySeverity(companyId, start, endExclusive) {
  const params = [start, endExclusive];
  let filter = '';
  if (companyId) {
    params.push(companyId);
    filter = ` AND company_id = $3::uuid`;
  }
  const r = await db.query(
    `
    SELECT severity, count(*)::int AS n
    FROM ai_incidents
    WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
    ${filter}
    GROUP BY severity
    `,
    params
  );
  const out = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const row of r.rows) {
    const k = String(row.severity || 'LOW').toUpperCase();
    if (out[k] != null) out[k] = row.n;
    else out.LOW += row.n;
  }
  return { by_severity: out, total: Object.values(out).reduce((a, b) => a + b, 0) };
}

async function queryIncidentsByType(companyId, start, endExclusive) {
  const params = [start, endExclusive];
  let filter = '';
  if (companyId) {
    params.push(companyId);
    filter = ` AND company_id = $3::uuid`;
  }
  const r = await db.query(
    `
    SELECT incident_type, count(*)::int AS n
    FROM ai_incidents
    WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
    ${filter}
    GROUP BY incident_type
    ORDER BY n DESC
    `,
    params
  );
  return r.rows.map((row) => ({ incident_type: row.incident_type, count: row.n }));
}

async function queryLegalAuditAggregates(companyId, start, endExclusive) {
  const params = [start, endExclusive];
  let filter = '';
  if (companyId) {
    params.push(companyId);
    filter = ` AND company_id = $3::uuid`;
  }
  try {
    const r = await db.query(
      `
      SELECT
        action_type,
        count(*)::int AS n,
        count(*) FILTER (WHERE anonymization_applied = true)::int AS anonymized_n,
        count(*) FILTER (WHERE retention_applied = true)::int AS retention_n
      FROM ai_legal_audit_logs
      WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
      ${filter}
      GROUP BY action_type
      ORDER BY n DESC
      `,
      params
    );
    const byAction = {};
    let totalAnon = 0;
    let totalRet = 0;
    for (const row of r.rows) {
      byAction[row.action_type] = {
        count: row.n,
        anonymized: row.anonymized_n,
        retention_applied: row.retention_n
      };
      totalAnon += row.anonymized_n || 0;
      totalRet += row.retention_n || 0;
    }
    const basis = await db.query(
      `
      SELECT coalesce(legal_basis, 'UNKNOWN') AS lb, count(*)::int AS n
      FROM ai_legal_audit_logs
      WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
      ${filter}
      GROUP BY lb
      ORDER BY n DESC
      LIMIT 24
      `,
      params
    );
    const status = await db.query(
      `
      SELECT coalesce(compliance_status, 'UNKNOWN') AS st, count(*)::int AS n
      FROM ai_legal_audit_logs
      WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
      ${filter}
      GROUP BY st
      ORDER BY n DESC
      LIMIT 24
      `,
      params
    );
    const reg = await db.query(
      `
      SELECT coalesce(regulation_tag, 'UNTAGGED') AS tag, count(*)::int AS n
      FROM ai_legal_audit_logs
      WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
      ${filter}
      GROUP BY tag
      ORDER BY n DESC
      LIMIT 24
      `,
      params
    );
    return {
      by_action: byAction,
      legal_basis_distribution: basis.rows.map((x) => ({ basis: x.lb, count: x.n })),
      compliance_status_distribution: status.rows.map((x) => ({ status: x.st, count: x.n })),
      regulation_tag_distribution: reg.rows.map((x) => ({ tag: x.tag, count: x.n })),
      totals: { anonymization_actions: totalAnon, retention_flags: totalRet }
    };
  } catch (e) {
    if (String(e.message || '').includes('anonymization_applied') || e.code === '42703') {
      const r2 = await db.query(
        `
        SELECT action_type, count(*)::int AS n
        FROM ai_legal_audit_logs
        WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
        ${filter}
        GROUP BY action_type
        ORDER BY n DESC
        `,
        params
      );
      const byAction = {};
      for (const row of r2.rows) byAction[row.action_type] = { count: row.n, anonymized: null, retention_applied: null };
      return {
        by_action: byAction,
        legal_basis_distribution: [],
        compliance_status_distribution: [],
        regulation_tag_distribution: [],
        totals: { anonymization_actions: null, retention_flags: null },
        note: 'Colunas avançadas de auditoria não disponíveis neste schema.'
      };
    }
    throw e;
  }
}

async function queryRiskSubjects(companyId, start, endExclusive, limit = 12) {
  const lim = Math.min(40, Math.max(3, limit));
  const limPh = companyId ? '$4' : '$3';
  const params = companyId ? [start, endExclusive, companyId, lim] : [start, endExclusive, lim];
  const r = await db.query(
    `
    SELECT user_id, company_id, count(*)::int AS incident_count
    FROM ai_incidents
    WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
      AND user_id IS NOT NULL
    ${companyId ? ' AND company_id = $3::uuid' : ''}
    GROUP BY user_id, company_id
    ORDER BY incident_count DESC
    LIMIT ${limPh}::int
    `,
    params
  );
  const out = [];
  for (const row of r.rows) {
    let score = 0;
    try {
      const b = await riskIntel.getUserRiskBundle(row.company_id, row.user_id);
      score = b.user_risk_score || 0;
    } catch (_) {
      /* agregado apenas */
    }
    out.push({
      subject_ref: anonymizeSubjectId(row.user_id),
      org_ref: anonymizeOrgId(row.company_id),
      incident_count_period: row.incident_count,
      risk_score_proxy: score
    });
  }
  return out;
}

async function queryOrgRiskRanking(companyId, start, endExclusive, limit = 12) {
  if (companyId) {
    return [
      {
        org_ref: anonymizeOrgId(companyId),
        note: 'Relatório limitado a uma organização; ranking multi-tenant omitido.'
      }
    ];
  }
  const lim = Math.min(40, Math.max(3, limit));
  const r = await db.query(
    `
    SELECT company_id, count(*)::int AS incident_count,
      count(*) FILTER (WHERE severity = 'CRITICAL')::int AS critical_n
    FROM ai_incidents
    WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
    GROUP BY company_id
    ORDER BY critical_n DESC, incident_count DESC
    LIMIT $3::int
    `,
    [start, endExclusive, lim]
  );
  const out = [];
  for (const row of r.rows) {
    let score = 0;
    try {
      const b = await riskIntel.getCompanyRiskBundle(row.company_id);
      score = b.company_risk_score || 0;
    } catch (_) {
      /* */
    }
    out.push({
      org_ref: anonymizeOrgId(row.company_id),
      incident_count_period: row.incident_count,
      critical_incidents_period: row.critical_n,
      risk_score_proxy: score
    });
  }
  return out;
}

async function queryWeeklyRiskPressure(companyId, start, endExclusive) {
  const params = [start, endExclusive];
  let filter = '';
  if (companyId) {
    params.push(companyId);
    filter = ` AND company_id = $3::uuid`;
  }
  const r = await db.query(
    `
    SELECT
      date_trunc('week', created_at AT TIME ZONE 'UTC')::date AS week_start,
      count(*)::int AS incidents,
      avg((CASE severity
        WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END))::float AS avg_severity_numeric
    FROM ai_incidents
    WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
    ${filter}
    GROUP BY 1
    ORDER BY 1 ASC
    `,
    params
  );
  return r.rows.map((row) => ({
    week_start: row.week_start,
    incidents: row.incidents,
    avg_severity_numeric: row.avg_severity_numeric,
    risk_pressure_proxy: Math.min(
      100,
      Math.round(row.incidents * 2.2 + Math.max(0, (row.avg_severity_numeric || 1) - 1) * 12)
    )
  }));
}

function learningSnippet(scope, companyId) {
  try {
    const snap = aiLearningFeedbackService.getAdminSnapshot();
    if (scope === 'company' && companyId) {
      const row = (snap.by_company || []).find((c) => c.company_id === companyId);
      return {
        source: 'ai_learning_feedback_memory',
        acceptance_rate_pct: row?.acceptance_rate ?? null,
        events_sample: row?.events ?? 0,
        flags: snap.flags
      };
    }
    return {
      source: 'ai_learning_feedback_memory',
      global_acceptance_rate_pct: snap.global?.acceptance_rate ?? null,
      global_rejection_rate_pct: snap.global?.rejection_rate ?? null,
      pattern_hint: snap.global?.pattern_hint || null,
      flags: snap.flags
    };
  } catch (_) {
    return { source: 'ai_learning_feedback_memory', error: 'snapshot_unavailable' };
  }
}

function observabilitySnippet() {
  try {
    const m = observabilityService.getMetricsSnapshot();
    return {
      ai_responses_generated: m.ai_responses_generated,
      ai_responses_blocked: m.ai_responses_blocked,
      policy_violations_count: m.policy_violations_count,
      compliance_incidents_count: m.compliance_incidents_count,
      note: 'Métricas acumuladas em memória (processo); não filtradas por período.'
    };
  } catch (_) {
    return null;
  }
}

function buildComplianceFlags({ trace, incidents, legal, period }) {
  const flags = [];
  const total = trace.total_decisions || 0;
  const sensRate = total > 0 ? (trace.class_sensitive_flag || 0) / total : 0;
  if (sensRate > 0.22 && total >= 12) {
    flags.push({
      code: 'HIGH_SENSITIVE_CLASSIFICATION_VOLUME',
      severity: 'MEDIUM',
      detail: 'Fração elevada de interações classificadas com dados sensíveis no período.'
    });
  }
  const hiCritRate = total > 0 ? (trace.class_high_critical || 0) / total : 0;
  if (hiCritRate > 0.18 && total >= 10) {
    flags.push({
      code: 'ELEVATED_CRITICAL_DATA_CLASSIFICATION',
      severity: 'HIGH',
      detail: 'Proporção significativa de classificações HIGH/CRITICAL em traces.'
    });
  }

  const decided =
    (trace.hitl_accepted || 0) + (trace.hitl_rejected || 0) + (trace.hitl_partial || 0);
  const rejRate = decided > 0 ? (trace.hitl_rejected || 0) / decided : 0;
  if (rejRate > 0.45 && decided >= 8) {
    flags.push({
      code: 'HITL_REJECTION_PRESSURE',
      severity: 'MEDIUM',
      detail: 'Taxa de rejeição humana (HITL) elevada face ao universo decidido.'
    });
  }

  if (legal?.totals && legal.totals.anonymization_actions != null) {
    const blocks = legal.by_action?.BLOCK?.count || 0;
    const anon = legal.totals.anonymization_actions || 0;
    if (blocks >= 8 && anon < Math.max(1, Math.floor(blocks * 0.15))) {
      flags.push({
        code: 'ANONYMIZATION_COVERAGE_GAP',
        severity: 'LOW',
        detail: 'Volume de bloqueios registados na trilha legal com poucas ações ANONYMIZE explícitas.'
      });
    }
    const proc = legal.by_action?.PROCESS?.count || 0;
    const ret = legal.totals.retention_flags || 0;
    if (proc > 40 && ret === 0) {
      flags.push({
        code: 'RETENTION_FLAG_SPARSE',
        severity: 'LOW',
        detail: 'Muitos eventos PROCESS sem flags de retenção aplicada na trilha legal.'
      });
    }
  }

  const incPerDay = period.span_days > 0 ? incidents.total / period.span_days : 0;
  if (incidents.total >= 25 && incPerDay >= 1.2) {
    flags.push({
      code: 'INCIDENT_VOLUME_ELEVATED',
      severity: 'HIGH',
      detail: 'Contagem de incidentes no período acima do limiar operacional de referência.'
    });
  }

  return flags;
}

function buildHighlights(reportType, payload) {
  const h = [];
  if (payload.trace?.total_decisions != null) {
    h.push(`Interações IA registadas no período: ${payload.trace.total_decisions}.`);
  }
  if (payload.incidents?.total != null) {
    h.push(`Incidentes no período: ${payload.incidents.total}.`);
  }
  if (reportType === 'COMPLIANCE_AUDIT' && payload.legal?.by_action) {
    const keys = Object.keys(payload.legal.by_action);
    if (keys.length) h.push(`Tipos de ação na trilha legal: ${keys.slice(0, 8).join(', ')}.`);
  }
  if (reportType === 'POLICY_EFFECTIVENESS') {
    h.push(
      `Respostas em modo limitado/restrito (proxy via traces): ${(payload.trace?.mode_limited || 0) + (payload.trace?.mode_restricted || 0)}.`
    );
  }
  return h.slice(0, 12);
}

/**
 * @param {object} opts
 * @param {string} opts.adminProfile
 * @param {string|null} [opts.company_id]
 * @param {string} opts.period_start
 * @param {string} opts.period_end
 * @param {string} opts.report_type
 * @param {string} [opts.format]
 */
async function generateComplianceReport(opts) {
  const report_type = String(opts.report_type || '').trim().toUpperCase();
  if (!REPORT_TYPES.has(report_type)) {
    return {
      ok: false,
      error: `report_type inválido. Use: ${[...REPORT_TYPES].join(', ')}`,
      code: 'INVALID_REPORT_TYPE'
    };
  }

  const access = resolveAccessScope(opts.adminProfile, opts.company_id);
  if (access.error) {
    return { ok: false, error: access.error, code: 'ACCESS_DENIED' };
  }

  const period = parsePeriod(opts.period_start, opts.period_end);
  if (period.error) {
    return { ok: false, error: period.error, code: 'INVALID_PERIOD' };
  }

  const companyFilter = access.company_id;
  const { start, endExclusive, endInclusive, span_days } = period;

  const [trace, incidents, incidentsByType, legal] = await Promise.all([
    queryTraceMetrics(companyFilter, start, endExclusive),
    queryIncidentsBySeverity(companyFilter, start, endExclusive),
    queryIncidentsByType(companyFilter, start, endExclusive),
    queryLegalAuditAggregates(companyFilter, start, endExclusive)
  ]);

  let riskSeries = [];
  let riskSubjects = [];
  let orgRanking = [];
  if (report_type === 'RISK_ANALYSIS') {
    [riskSeries, riskSubjects, orgRanking] = await Promise.all([
      queryWeeklyRiskPressure(companyFilter, start, endExclusive),
      queryRiskSubjects(companyFilter, start, endExclusive),
      queryOrgRiskRanking(companyFilter, start, endExclusive)
    ]);
  }

  const decided =
    (trace.hitl_accepted || 0) + (trace.hitl_rejected || 0) + (trace.hitl_partial || 0);
  const hitlAcceptanceRate = decided > 0 ? Math.round(((trace.hitl_accepted || 0) / decided) * 1000) / 10 : null;

  const summary = {
    total_ai_decisions: trace.total_decisions || 0,
    hitl_acceptance_rate_pct: hitlAcceptanceRate,
    hitl_rejection_rate_pct:
      decided > 0 ? Math.round(((trace.hitl_rejected || 0) / decided) * 1000) / 10 : null,
    incidents_total: incidents.total,
    incidents_by_severity: incidents.by_severity
  };

  const metrics = {
    traces: {
      total: trace.total_decisions,
      human_validation: {
        accepted: trace.hitl_accepted,
        rejected: trace.hitl_rejected,
        partial_or_adjusted: trace.hitl_partial,
        pending: trace.hitl_pending
      },
      classification: {
        high_or_critical_count: trace.class_high_critical,
        sensitive_flag_count: trace.class_sensitive_flag
      },
      adaptive_governance: {
        response_limited: trace.mode_limited,
        response_restricted: trace.mode_restricted,
        adaptive_blocked_traces: trace.adaptive_blocked
      },
      policy_model_info: {
        violation_traces: trace.policy_violation_trace,
        conflict_traces: trace.policy_conflict_trace,
        governance_tag_policy_violation: trace.tag_policy_violation
      },
      governance_tags: {
        compliance_anonymized_traces: trace.tag_compliance_anonymized,
        adaptive_block_tags: trace.tag_adaptive_block
      }
    },
    incidents: {
      by_severity: incidents.by_severity,
      total: incidents.total,
      by_type: incidentsByType
    },
    legal_audit: legal,
    learning_feedback: learningSnippet(access.scope, companyFilter),
    observability_process: observabilitySnippet()
  };

  if (report_type === 'RISK_ANALYSIS') {
    metrics.risk_analysis = {
      weekly_pressure: riskSeries,
      subjects_ranking_anonymized: riskSubjects,
      organizations_ranking_anonymized: orgRanking,
      behavioral_mix: incidentsByType
    };
  }

  if (report_type === 'POLICY_EFFECTIVENESS') {
    metrics.policy_effectiveness = {
      limited_and_restricted_traces: (trace.mode_limited || 0) + (trace.mode_restricted || 0),
      adaptive_blocks: trace.adaptive_blocked || 0,
      policy_violations_in_traces: trace.policy_violation_trace || 0,
      policy_conflicts_in_traces: trace.policy_conflict_trace || 0,
      compliance_anonymized_traces: trace.tag_compliance_anonymized || 0
    };
  }

  if (report_type === 'GOVERNANCE_SUMMARY') {
    metrics.governance = {
      summary,
      top_incident_types: incidentsByType.slice(0, 8),
      policy_proxy: metrics.traces.policy_model_info
    };
  }

  if (report_type === 'COMPLIANCE_AUDIT') {
    metrics.compliance_audit = {
      legal_trail: legal,
      block_actions: legal.by_action?.BLOCK || null,
      anonymize_actions: legal.by_action?.ANONYMIZE || null,
      process_actions: legal.by_action?.PROCESS || null
    };
  }

  const compliance_flags = buildComplianceFlags({
    trace,
    incidents,
    legal,
    period: { span_days }
  });

  const highlights = buildHighlights(report_type, { trace, incidents, legal });

  const format = String(opts.format || 'json').toLowerCase() === 'pdf' ? 'pdf' : 'json';

  return {
    ok: true,
    report_type,
    period: {
      start: start.toISOString(),
      end: endInclusive.toISOString(),
      span_days,
      max_range_days_allowed: MAX_RANGE_DAYS
    },
    scope: {
      mode: access.scope,
      company_id: companyFilter
    },
    generated_at: new Date().toISOString(),
    summary,
    metrics,
    highlights,
    compliance_flags,
    export: {
      format,
      pdf_ready: true,
      note: 'Exportação PDF não gerada nesta versão; estrutura estável para renderização futura.'
    }
  };
}

module.exports = {
  MAX_RANGE_DAYS,
  REPORT_TYPES,
  resolveAccessScope,
  parseDateParam,
  parsePeriod,
  anonymizeSubjectId,
  anonymizeOrgId,
  buildComplianceFlags,
  generateComplianceReport
};
