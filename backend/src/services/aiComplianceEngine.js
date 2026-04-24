'use strict';

const dataClassificationService = require('./dataClassificationService');
const complianceAnonymizerService = require('./complianceAnonymizerService');
const aiLegalAuditService = require('./aiLegalAuditService');
const complianceDecisionService = require('./complianceDecisionService');

const LEGAL_BASIS = {
  LEGITIMATE_INTEREST: 'LEGITIMATE_INTEREST',
  CONTRACT: 'CONTRACT',
  CONSENT: 'CONSENT',
  LEGAL_OBLIGATION: 'LEGAL_OBLIGATION',
  INDUSTRIAL_OPERATION: 'INDUSTRIAL_OPERATION'
};

const ENABLED = process.env.AI_COMPLIANCE_ENGINE_ENABLED !== 'false';

function resolveLegalBasis(module) {
  const m = String(module || '').toLowerCase();
  if (m.includes('manutencao') || m.includes('manutenção')) return LEGAL_BASIS.INDUSTRIAL_OPERATION;
  if (m.includes('warehouse') || m.includes('logistica') || m.includes('logística')) {
    return LEGAL_BASIS.INDUSTRIAL_OPERATION;
  }
  return LEGAL_BASIS.LEGITIMATE_INTEREST;
}

const BLOCK_MSG =
  'A resposta assistida foi interrompida por política de conformidade (dados pessoais ou sensíveis identificados em patamar crítico). Contacte o encarregado de proteção de dados (DPO) ou o supervisor IMPETUS.';

/**
 * @param {object} ctx
 * @param {string} ctx.traceId
 * @param {object} ctx.user
 * @param {object} ctx.synthesis
 * @param {object} ctx.dossier
 * @param {string} ctx.sanitized
 * @param {object} ctx.contextSnapshot
 * @param {string} ctx.module
 * @param {'full'|'limited'|'restricted'|'none'} ctx.adaptiveResponseMode
 * @param {object} [ctx.policyRules] — regras fundidas (ex.: compliance_force_anonymize, data_retention_*)
 */
async function processAfterAdaptive(ctx) {
  const legal_basis = resolveLegalBasis(ctx.module);
  const baseCompliance = (classification, action, justification) => ({
    data_classification: classification,
    legal_basis,
    compliance_action: action,
    justification
  });

  if (!ENABLED || !ctx?.synthesis || !ctx?.user?.company_id) {
    const low = {
      contains_personal_data: false,
      contains_sensitive_data: false,
      detected_fields: [],
      risk_level: 'LOW'
    };
    return {
      legal_basis,
      data_classification: low,
      compliance: baseCompliance(low, 'allowed', 'Motor de conformidade desativado ou sem contexto.'),
      compliance_incident: null,
      governance_tags: []
    };
  }

  const payload = {
    prompt: ctx.sanitized,
    context: ctx.contextSnapshot || {},
    model_answer: String(ctx.synthesis.answer || ctx.synthesis.content || '')
  };
  const classification = dataClassificationService.classifyData(payload);
  const plan = complianceDecisionService.planCompliance(classification, {
    adaptiveResponseMode: ctx.adaptiveResponseMode,
    policyRules: ctx.policyRules || null
  });
  const criticalCombo = plan.criticalCombo;
  const sensitiveHigh = plan.sensitiveHigh;

  let compliance_action = 'allowed';
  let justification =
    'Fluxo permitido: classificação não atingiu limiar crítico para bloqueio automático.';
  const governance_tags = [];

  if (criticalCombo) {
    compliance_action = 'blocked';
    justification =
      'Bloqueio automático: dados pessoais/sensíveis com risco CRITICAL (LGPD — minimização e necessidade).';
    ctx.synthesis.answer = BLOCK_MSG;
    if (typeof ctx.synthesis.content === 'string') ctx.synthesis.content = BLOCK_MSG;
    ctx.dossier.decision.requires_human_validation = true;
    ctx.synthesis.requires_action = true;
    ctx.synthesis.degraded = true;
    governance_tags.push('COMPLIANCE_BLOCK');
    aiLegalAuditService.enqueueLegalAudit({
      trace_id: ctx.traceId,
      company_id: ctx.user.company_id,
      user_id: ctx.user.id,
      action_type: 'BLOCK',
      data_classification: classification,
      legal_basis,
      risk_level: classification.risk_level,
      decision_summary: justification,
      ...complianceDecisionService.buildAuditExtensions({
        complianceAction: 'blocked',
        anonymizationApplied: false
      })
    });
    return {
      legal_basis,
      data_classification: classification,
      compliance: baseCompliance(classification, compliance_action, justification),
      compliance_incident: {
        severity: 'CRITICAL',
        summary: `[COMPLIANCE_RISK] ${justification} Campos: ${classification.detected_fields.join(', ') || '—'}.`
      },
      governance_tags
    };
  }

  if (sensitiveHigh) {
    ctx.dossier.decision.requires_human_validation = true;
    ctx.synthesis.requires_action = true;
    justification =
      'Validação humana exigida: dados sensíveis com risco HIGH (LGPD — supervisão e necessidade).';
    aiLegalAuditService.enqueueLegalAudit({
      trace_id: ctx.traceId,
      company_id: ctx.user.company_id,
      user_id: ctx.user.id,
      action_type: 'PROCESS',
      data_classification: classification,
      legal_basis,
      risk_level: classification.risk_level,
      decision_summary: justification,
      ...complianceDecisionService.buildAuditExtensions({
        complianceAction: 'allowed',
        anonymizationApplied: false,
        compliance_status_override: 'REVIEW_REQUIRED'
      })
    });
  }

  const shouldAnonymize = plan.shouldAnonymize;

  let anonymization_applied = false;
  if (shouldAnonymize) {
    const before = String(ctx.synthesis.answer || '');
    ctx.synthesis.answer = complianceAnonymizerService.anonymizeSensitiveData(before);
    if (typeof ctx.synthesis.content === 'string') {
      ctx.synthesis.content = complianceAnonymizerService.anonymizeSensitiveData(ctx.synthesis.content);
    }
    if (ctx.synthesis.answer !== before) {
      anonymization_applied = true;
      compliance_action = 'anonymized';
      justification =
        'Saída anonimizada: minimização de dados pessoais/sensíveis na resposta ao utilizador.';
      governance_tags.push('COMPLIANCE_ANONYMIZED');
      aiLegalAuditService.enqueueLegalAudit({
        trace_id: ctx.traceId,
        company_id: ctx.user.company_id,
        user_id: ctx.user.id,
        action_type: 'ANONYMIZE',
        data_classification: classification,
        legal_basis,
        risk_level: classification.risk_level,
        decision_summary: justification,
        ...complianceDecisionService.buildAuditExtensions({
          complianceAction: 'anonymized',
          anonymizationApplied: true
        })
      });
    }
  }

  if (!criticalCombo && !sensitiveHigh && !anonymization_applied) {
    aiLegalAuditService.enqueueLegalAudit({
      trace_id: ctx.traceId,
      company_id: ctx.user.company_id,
      user_id: ctx.user.id,
      action_type: 'ACCESS',
      data_classification: classification,
      legal_basis,
      risk_level: classification.risk_level,
      decision_summary:
        'Consulta registada: classificação sem bloqueio nem anonimização adicional na saída.',
      ...complianceDecisionService.buildAuditExtensions({
        complianceAction: 'allowed',
        anonymizationApplied: false
      })
    });
  }

  if (sensitiveHigh && !anonymization_applied) {
    compliance_action = 'allowed';
    justification =
      'Validação humana obrigatória mantida; resposta não anonimizada adicionalmente nesta iteração.';
  }

  return {
    legal_basis,
    data_classification: classification,
    compliance: baseCompliance(classification, compliance_action, justification),
    compliance_incident: null,
    governance_tags
  };
}

async function countLegalAuditAnonymizeSince(sqlInterval) {
  const db = require('../db');
  const withArch = `
    SELECT count(*)::int AS n
    FROM ai_legal_audit_logs
    WHERE action_type = 'ANONYMIZE'
      AND created_at >= now() - ${sqlInterval}
      AND archived IS NOT TRUE`;
  const noArch = `
    SELECT count(*)::int AS n
    FROM ai_legal_audit_logs
    WHERE action_type = 'ANONYMIZE'
      AND created_at >= now() - ${sqlInterval}`;
  try {
    return await db.query(withArch);
  } catch (e) {
    if (e.code === '42703' && /archived/i.test(String(e.message || ''))) {
      return db.query(noArch);
    }
    throw e;
  }
}

async function getComplianceOverview() {
  const db = require('../db');
  const [sensitiveTraces, complianceIncidents, topCompanies, fieldAgg, basisDist] = await Promise.all([
    db.query(
      `SELECT count(*)::int AS n
       FROM ai_interaction_traces
       WHERE (data_classification->>'contains_sensitive_data')::boolean = true
         AND created_at >= now() - interval '90 days'`
    ),
    db.query(
      `SELECT count(*)::int AS n
       FROM ai_incidents
       WHERE incident_type = 'COMPLIANCE_RISK'
         AND created_at >= now() - interval '365 days'`
    ),
    db.query(
      `SELECT t.company_id,
              COALESCE(c.name, c.razao_social, t.company_id::text) AS company_name,
              count(*)::int AS sensitive_cnt
       FROM ai_interaction_traces t
       LEFT JOIN companies c ON c.id = t.company_id
       WHERE (t.data_classification->>'contains_sensitive_data')::boolean = true
         AND t.created_at >= now() - interval '90 days'
       GROUP BY t.company_id, c.name, c.razao_social
       ORDER BY sensitive_cnt DESC
       LIMIT 15`
    ),
    db.query(
      `SELECT fld AS field, count(*)::int AS n
       FROM ai_interaction_traces,
       LATERAL jsonb_array_elements_text(
         COALESCE(data_classification->'detected_fields', '[]'::jsonb)
       ) AS fld
       WHERE created_at >= now() - interval '90 days'
         AND data_classification IS NOT NULL
         AND jsonb_array_length(COALESCE(data_classification->'detected_fields', '[]'::jsonb)) > 0
       GROUP BY fld
       ORDER BY n DESC
       LIMIT 25`
    ),
    db.query(
      `SELECT coalesce(legal_basis, 'UNKNOWN') AS legal_basis, count(*)::int AS n
       FROM ai_interaction_traces
       WHERE created_at >= now() - interval '90 days'
       GROUP BY 1
       ORDER BY n DESC`
    )
  ]);
  const anonymizationEvents = await countLegalAuditAnonymizeSince(`interval '90 days'`);

  const data_types_detected = {};
  for (const row of fieldAgg.rows) {
    if (row.field) data_types_detected[row.field] = row.n;
  }
  const legal_basis_distribution = {};
  for (const row of basisDist.rows) {
    legal_basis_distribution[row.legal_basis] = row.n;
  }

  return {
    total_sensitive_interactions: sensitiveTraces.rows[0]?.n || 0,
    compliance_risk_incidents: complianceIncidents.rows[0]?.n || 0,
    top_sensitive_companies: topCompanies.rows.map((r) => ({
      company_id: r.company_id,
      company_name: r.company_name,
      sensitive_interactions_90d: r.sensitive_cnt
    })),
    data_types_detected,
    legal_basis_distribution,
    anonymization_events: anonymizationEvents.rows[0]?.n || 0
  };
}

async function getAdvancedComplianceDashboard() {
  const dataLifecycleService = require('./dataLifecycleService');
  const retention = dataLifecycleService.getRetentionPolicy();
  const lastRun = dataLifecycleService.getLastRunStats();
  const db = require('../db');
  let sensitive_traces_not_redacted_30d = 0;
  let anonymization_audit_events_30d = 0;
  let audit_by_status = [];
  try {
    const r = await db.query(
      `
      SELECT count(*)::int AS n
      FROM ai_interaction_traces t
      WHERE (t.data_classification->>'contains_sensitive_data')::boolean = true
        AND t.created_at >= now() - interval '30 days'
        AND NOT (COALESCE(t.model_info, '{}'::jsonb) @> '{"lifecycle_redacted": true}'::jsonb)
      `
    );
    sensitive_traces_not_redacted_30d = r.rows[0]?.n || 0;
  } catch (_) {
    /* schema opcional */
  }
  try {
    const r2 = await countLegalAuditAnonymizeSince(`interval '30 days'`);
    anonymization_audit_events_30d = r2.rows[0]?.n || 0;
  } catch (_) {
    /* schema opcional */
  }
  try {
    const withArch = `
      SELECT coalesce(compliance_status, 'UNKNOWN') AS st, count(*)::int AS n
      FROM ai_legal_audit_logs
      WHERE created_at >= now() - interval '30 days'
        AND archived IS NOT TRUE
      GROUP BY 1
      ORDER BY n DESC`;
    const noArch = `
      SELECT coalesce(compliance_status, 'UNKNOWN') AS st, count(*)::int AS n
      FROM ai_legal_audit_logs
      WHERE created_at >= now() - interval '30 days'
      GROUP BY 1
      ORDER BY n DESC`;
    let r3;
    try {
      r3 = await db.query(withArch);
    } catch (e) {
      if (e.code === '42703' && /archived/i.test(String(e.message || ''))) {
        r3 = await db.query(noArch);
      } else {
        throw e;
      }
    }
    audit_by_status = r3.rows.map((x) => ({ compliance_status: x.st, count: x.n }));
  } catch (_) {
    /* schema opcional */
  }

  const alerts = [...dataLifecycleService.computeRegulatoryAlerts(retention.retention_policy)];
  if (sensitive_traces_not_redacted_30d > 500) {
    alerts.push({
      code: 'HIGH_SENSITIVE_TRACE_VOLUME',
      severity: 'WARNING',
      message: 'Volume elevado de traces sensíveis sem redação de ciclo de vida nos últimos 30 dias.'
    });
  }

  return {
    retention_policy: retention.retention_policy,
    lifecycle_last_run: {
      at: lastRun.at,
      traces_deleted: lastRun.traces_deleted,
      traces_anonymized: lastRun.traces_anonymized,
      audit_logs_archived: lastRun.audit_logs_archived ?? 0,
      errors: lastRun.errors || []
    },
    aggregates_30d: {
      sensitive_traces_not_redacted: sensitive_traces_not_redacted_30d,
      anonymization_audit_events: anonymization_audit_events_30d,
      audit_by_compliance_status: audit_by_status
    },
    regulatory_alerts: alerts,
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  LEGAL_BASIS,
  ENABLED,
  resolveLegalBasis,
  processAfterAdaptive,
  getComplianceOverview,
  getAdvancedComplianceDashboard
};
