'use strict';

const dataClassificationService = require('./dataClassificationService');
const complianceAnonymizerService = require('./complianceAnonymizerService');
const aiLegalAuditService = require('./aiLegalAuditService');

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

  let compliance_action = 'allowed';
  let justification =
    'Fluxo permitido: classificação não atingiu limiar crítico para bloqueio automático.';
  const governance_tags = [];

  const needAnonymizeByAdaptive =
    ctx.adaptiveResponseMode === 'limited' || ctx.adaptiveResponseMode === 'restricted';
  const sensitiveHigh =
    classification.contains_sensitive_data && classification.risk_level === 'HIGH';
  const criticalCombo =
    classification.risk_level === 'CRITICAL' &&
    (classification.contains_sensitive_data || classification.contains_personal_data);

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
      decision_summary: justification
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
      decision_summary: justification
    });
  }

  const shouldAnonymize =
    needAnonymizeByAdaptive ||
    (classification.contains_sensitive_data &&
      (classification.risk_level === 'HIGH' || classification.risk_level === 'MEDIUM'));

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
        decision_summary: justification
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
        'Consulta registada: classificação sem bloqueio nem anonimização adicional na saída.'
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

async function getComplianceOverview() {
  const db = require('../db');
  const [
    sensitiveTraces,
    complianceIncidents,
    topCompanies,
    fieldAgg,
    basisDist,
    anonymizationEvents
  ] = await Promise.all([
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
    ),
    db.query(
      `SELECT count(*)::int AS n
       FROM ai_legal_audit_logs
       WHERE action_type = 'ANONYMIZE'
         AND created_at >= now() - interval '90 days'`
    )
  ]);

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

module.exports = {
  LEGAL_BASIS,
  ENABLED,
  resolveLegalBasis,
  processAfterAdaptive,
  getComplianceOverview
};
