'use strict';

/**
 * AIOI-P0.4 — Builder de contexto e payload de decisão
 *
 * Responsabilidade:
 *   1. Traduzir IOE triaged → operational_plan (formato esperado pelo ODE)
 *   2. Mapear saída do operationalDecisionEngine → decision_payload canônico
 *   3. Resolver decision_type a partir de códigos de alerta do ODE (sem lógica paralela)
 *
 * REGRAS ABSOLUTAS:
 *   ✓ Sem cálculo de prioridade, Truth, Learning ou classificação
 *   ✓ decision_payload contém APENAS: recommendation, rationale, confidence, source, generated_at
 *   ✓ Sem comandos executáveis, SQL, scripts ou side-effects
 *   ✓ decision_type derivado exclusivamente de códigos retornados pelo ODE
 *
 * AIOI_INTEGRATION_CATALOG.md §2.3: WRAP — IOE → plan → evaluateOperationalDecisions()
 */

const LAYER = 'AIOI_DECISION_PAYLOAD_BUILDER';

const VALID_DECISION_TYPES = new Set([
  'workflow', 'direct_action', 'suggest_only', 'escalate'
]);

// Mapeamento de códigos de alerta do ODE → decision_type (derivado do soberano, não inventado)
const ODE_ALERT_CODE_TO_DECISION_TYPE = {
  IMMEDIATE_CRITICAL:        'escalate',
  RISK_CONCENTRATION:        'escalate',
  IMMEDIATE_BACKLOG:         'suggest_only',
  TEMPORAL_TREND_UP:         'suggest_only',
  SHORT_TERM_WITHOUT_IMMEDIATE: 'suggest_only'
};

// Mapeamento priority_band do IOE → prioridade do plano ODE (vocabulário, não score)
const BAND_TO_PLAN_PRIORITY = {
  critical: 'CRITICAL',
  high:     'HIGH',
  medium:   'MEDIUM',
  low:      'LOW'
};

// ---------------------------------------------------------------------------
// IOE → operational_plan (contexto para o ODE)
// ---------------------------------------------------------------------------

/**
 * Traduz um IOE triaged para o formato operational_plan consumido pelo ODE.
 * Apenas reencaminha metadados já persistidos — sem inferência avançada.
 *
 * @param {object} ioe — linha de industrial_operational_events
 * @returns {object} operational_plan
 */
function buildOperationalPlanFromIoe(ioe) {
  if (!ioe || typeof ioe !== 'object') {
    throw new Error(`${LAYER}: ioe inválido ou ausente`);
  }

  const planPriority = BAND_TO_PLAN_PRIORITY[ioe.priority_band] || 'MEDIUM';
  const machineId = ioe.equipment_id || ioe.entity_id || null;

  const action = {
    machine_id: machineId,
    action:     _actionLabelFromCategory(ioe.category, ioe.source_type),
    reason:     _reasonFromIoe(ioe),
    priority:   planPriority,
    source:     'aioi_ioe_bridge'
  };

  // Horizonte imediato para bandas critical/high; curto prazo para medium/low
  const immediate_actions  = (planPriority === 'CRITICAL' || planPriority === 'HIGH')
    ? [action]
    : [];
  const short_term_actions = (planPriority === 'MEDIUM')
    ? [action]
    : [];
  const preventive_actions = (planPriority === 'LOW')
    ? [action]
    : [];

  return {
    immediate_actions,
    short_term_actions,
    preventive_actions,
    _aioi_context: {
      ioe_id:         ioe.id,
      category:       ioe.category,
      source_type:    ioe.source_type,
      priority_band:  ioe.priority_band,
      priority_score: ioe.priority_score,
      truth_state:    ioe.truth_state,
      correlation_id: ioe.correlation_id
    }
  };
}

/**
 * Constrói o contexto para evaluateOperationalDecisions().
 *
 * @param {object} ioe
 * @param {string} companyId
 * @returns {object}
 */
function buildOdeContext(ioe, companyId) {
  return {
    company_id:        companyId,
    intent:            'aioi_decision_bridge',
    source:            'aioi_ioe',
    ioe_id:            ioe.id,
    correlation_id:    ioe.correlation_id,
    temporal_insights: {
      trend_direction: ioe.priority_band === 'critical' ? 'increasing' : 'stable',
      anomaly_patterns: Array.isArray(ioe.evidence_refs)
        ? ioe.evidence_refs.filter(e => e.type && e.type.includes('pattern'))
        : []
    }
  };
}

// ---------------------------------------------------------------------------
// Saída ODE → decision_payload canônico
// ---------------------------------------------------------------------------

/**
 * Mapeia a avaliação do ODE para o decision_payload canônico do IOE.
 * Formato obrigatório P0.4: { recommendation, rationale, confidence, source, generated_at }
 *
 * @param {object} evaluation — saída de evaluateOperationalDecisions()
 * @param {object} [ioe] — IOE original (para confidence de classificação)
 * @returns {object}
 */
function buildDecisionPayload(evaluation, ioe) {
  const ev = evaluation && typeof evaluation === 'object' ? evaluation : {};
  const alerts  = Array.isArray(ev.alerts)  ? ev.alerts  : [];
  const triggers = Array.isArray(ev.triggers) ? ev.triggers : [];
  const actions = Array.isArray(ev.recommended_actions) ? ev.recommended_actions : [];

  const primaryAlert  = alerts[0] || null;
  const primaryAction = actions[0] || null;
  const primaryTrigger = triggers[0] || null;

  const recommendation = primaryAction?.action
    || primaryAlert?.message
    || primaryTrigger?.reason
    || 'Revisão operacional sugerida pelo motor de decisão';

  const rationaleParts = [
    ...triggers.slice(0, 3).map(t => t.reason).filter(Boolean),
    ...alerts.slice(0, 2).map(a => a.message).filter(Boolean)
  ];
  const rationale = rationaleParts.length
    ? rationaleParts.join(' | ')
    : 'Avaliação operacional baseada no contexto do IOE';

  // Confiança: prioriza classification_conf do IOE; fallback baseado em volume de sinais ODE
  let confidence = ioe?.classification_conf != null
    ? Math.min(99, Math.max(0, Number(ioe.classification_conf)))
    : 50;
  if (alerts.some(a => a.severity === 'high')) {
    confidence = Math.min(99, confidence + 10);
  }

  return {
    recommendation: String(recommendation).slice(0, 500),
    rationale:      String(rationale).slice(0, 1000),
    confidence:       Math.round(confidence),
    source:           'operationalDecisionEngine',
    generated_at:     new Date().toISOString()
  };
}

/**
 * Resolve decision_type a partir dos códigos de alerta retornados pelo ODE.
 * P0.4: nunca retorna 'workflow' ou 'direct_action' (sem execução automática).
 *
 * @param {object} evaluation — saída de evaluateOperationalDecisions()
 * @returns {string} 'suggest_only' | 'escalate'
 */
function resolveDecisionType(evaluation) {
  const alerts = Array.isArray(evaluation?.alerts) ? evaluation.alerts : [];

  for (const alert of alerts) {
    const code = alert?.code;
    if (code && ODE_ALERT_CODE_TO_DECISION_TYPE[code] === 'escalate') {
      return 'escalate';
    }
  }

  // P0.4: somente sugestão — nunca workflow/direct_action sem HITL explícito futuro
  return 'suggest_only';
}

/**
 * Valida que decision_payload não contém campos proibidos.
 *
 * @param {object} payload
 * @returns {boolean}
 */
function isValidDecisionPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const allowed = new Set(['recommendation', 'rationale', 'confidence', 'source', 'generated_at']);
  const keys = Object.keys(payload);
  if (!keys.every(k => allowed.has(k))) return false;
  if (typeof payload.recommendation !== 'string') return false;
  if (typeof payload.rationale !== 'string') return false;
  if (typeof payload.confidence !== 'number') return false;
  if (payload.source !== 'operationalDecisionEngine') return false;
  return true;
}

/**
 * Verifica se o IOE já possui decisão persistida (idempotência).
 *
 * @param {object} ioe
 * @returns {boolean}
 */
function hasExistingDecision(ioe) {
  return !!(ioe && ioe.decision_type && ioe.decision_payload);
}

// ---------------------------------------------------------------------------
// Helpers internos (vocabulário, não scoring)
// ---------------------------------------------------------------------------

function _actionLabelFromCategory(category, sourceType) {
  const labels = {
    equipment_failure:      'Investigar falha de equipamento',
    equipment_degradation:  'Monitorar degradação de equipamento',
    production_deviation:   'Revisar desvio de produção',
    quality_issue:          'Analisar problema de qualidade',
    safety_incident:        'Avaliar incidente de segurança',
    maintenance_required:   'Agendar manutenção',
    communication_risk:     'Revisar comunicação de risco',
    task_overdue:           'Tratar tarefa vencida',
    environmental_alert:    'Verificar alerta ambiental',
    kpi_deviation:          'Analisar desvio de KPI',
    system_event:           'Revisar evento de sistema'
  };
  return labels[category] || `Revisar evento ${sourceType || 'operacional'}`;
}

function _reasonFromIoe(ioe) {
  const parts = [
    `category=${ioe.category || 'unknown'}`,
    `source=${ioe.source_type || 'unknown'}`,
    `band=${ioe.priority_band || 'low'}`,
    `score=${ioe.priority_score ?? 0}`
  ];
  if (ioe.truth_state) parts.push(`truth=${ioe.truth_state}`);
  return parts.join('; ');
}

module.exports = {
  buildOperationalPlanFromIoe,
  buildOdeContext,
  buildDecisionPayload,
  resolveDecisionType,
  isValidDecisionPayload,
  hasExistingDecision,
  VALID_DECISION_TYPES,
  ODE_ALERT_CODE_TO_DECISION_TYPE
};
