'use strict';

/**
 * Motor de decisão operacional: traduz operational_plan em gatilhos e alertas sugeridos.
 * Não executa comandos, não altera equipamentos — apenas avalia e sinaliza (logs + metadados estratégicos).
 */

/**
 * @param {unknown} p
 * @returns {string}
 */
function normPriority(p) {
  return p != null ? String(p).trim().toUpperCase() : 'MEDIUM';
}

/**
 * @param {object|null|undefined} plan
 * @param {object} [context]
 * @param {string} [context.company_id]
 * @param {string} [context.user_id]
 * @param {string} [context.intent]
 * @param {object} [context.temporal_insights]
 * @returns {{
 *   triggers: object[],
 *   alerts: object[],
 *   recommended_actions: object[]
 * }}
 */
function evaluateOperationalDecisions(plan, context = {}) {
  const triggers = [];
  const alerts = [];
  const recommended_actions = [];

  const ctx = context && typeof context === 'object' ? context : {};
  const immediate = Array.isArray(plan?.immediate_actions) ? plan.immediate_actions : [];
  const shortT = Array.isArray(plan?.short_term_actions) ? plan.short_term_actions : [];
  const preventive = Array.isArray(plan?.preventive_actions) ? plan.preventive_actions : [];

  const companyId = ctx.company_id != null ? String(ctx.company_id) : '';
  const temporal = ctx.temporal_insights && typeof ctx.temporal_insights === 'object' ? ctx.temporal_insights : {};

  let seq = 0;
  const pushTrigger = (horizon, reason, extra = {}) => {
    seq += 1;
    triggers.push({
      id: `ode_${horizon}_${seq}`,
      horizon,
      reason,
      company_id: companyId || undefined,
      ...extra
    });
  };

  const criticalImm = immediate.filter((a) => a && normPriority(a.priority) === 'CRITICAL');
  const highImm = immediate.filter((a) => a && normPriority(a.priority) === 'HIGH');

  if (criticalImm.length >= 1) {
    pushTrigger('immediate', 'Plano inclui ação imediata com prioridade CRITICAL', {
      count: criticalImm.length,
      machine_ids: criticalImm.map((a) => a.machine_id).filter(Boolean)
    });
    alerts.push({
      severity: 'high',
      code: 'IMMEDIATE_CRITICAL',
      message: `${criticalImm.length} ação(ões) imediata(s) CRITICAL no plano operacional — rever confirmação humana antes de qualquer execução.`,
      kind: 'suggestion_only'
    });
  }

  if (immediate.length >= 3) {
    pushTrigger('immediate', 'Volume elevado de ações imediatas no mesmo plano', { count: immediate.length });
    alerts.push({
      severity: 'medium',
      code: 'IMMEDIATE_BACKLOG',
      message: `Plano com ${immediate.length} itens imediatos — validar capacidade, ordem e dependências.`,
      kind: 'suggestion_only'
    });
  }

  if (highImm.length >= 2 || criticalImm.length + highImm.length >= 3) {
    pushTrigger('immediate', 'Concentração HIGH/CRITICAL no horizonte imediato', {
      critical: criticalImm.length,
      high: highImm.length
    });
    alerts.push({
      severity: 'medium',
      code: 'RISK_CONCENTRATION',
      message: 'Vários ativos em HIGH/CRITICAL — priorizar recursos e evitar sobrecarga da equipa.',
      kind: 'suggestion_only'
    });
  }

  const td = temporal.trend_direction != null ? String(temporal.trend_direction) : '';
  if (/increas|^up$/i.test(td) || /\bup\b/i.test(td)) {
    pushTrigger('temporal', 'Tendência temporal aponta aumento de pressão/risco', {
      trend_direction: td
    });
    alerts.push({
      severity: 'medium',
      code: 'TEMPORAL_TREND_UP',
      message: 'Sinais temporais alinhados a aumento de risco — reforçar monitorização e confirmação em campo.',
      kind: 'suggestion_only'
    });
  }

  const anom = Array.isArray(temporal.anomaly_patterns) ? temporal.anomaly_patterns : [];
  if (anom.length >= 2) {
    pushTrigger('temporal', 'Múltiplos padrões de anomalia temporal na janela analisada', {
      anomaly_count: anom.length
    });
  }

  const shortRisky = shortT.filter((a) => {
    const pr = normPriority(a && a.priority);
    return pr === 'HIGH' || pr === 'CRITICAL';
  });
  if (shortRisky.length >= 2 && immediate.length === 0) {
    pushTrigger('short_term', 'Riscos HIGH/CRITICAL no curto prazo sem itens imediatos explícitos', {
      count: shortRisky.length
    });
    alerts.push({
      severity: 'low',
      code: 'SHORT_TERM_WITHOUT_IMMEDIATE',
      message: 'Ações de curto prazo com severidade elevada — verificar se devem ser promovidas ao imediato.',
      kind: 'suggestion_only'
    });
  }

  for (const a of immediate.slice(0, 10)) {
    if (!a || typeof a !== 'object') {
      continue;
    }
    recommended_actions.push({
      horizon: 'immediate',
      machine_id: a.machine_id || null,
      action: a.action != null ? String(a.action) : '',
      reason: a.reason != null ? String(a.reason) : '',
      priority: a.priority != null ? String(a.priority) : null,
      source: 'operational_plan'
    });
  }
  for (const a of shortT.slice(0, 8)) {
    if (!a || typeof a !== 'object') {
      continue;
    }
    recommended_actions.push({
      horizon: 'short_term',
      machine_id: a.machine_id || null,
      action: a.action != null ? String(a.action) : '',
      reason: a.reason != null ? String(a.reason) : '',
      priority: a.priority != null ? String(a.priority) : null,
      source: 'operational_plan'
    });
  }
  for (const a of preventive.slice(0, 10)) {
    if (!a || typeof a !== 'object') {
      continue;
    }
    recommended_actions.push({
      horizon: 'preventive',
      machine_id: a.machine_id || null,
      action: a.action != null ? String(a.action) : '',
      reason: a.reason != null ? String(a.reason) : '',
      priority: a.priority != null ? String(a.priority) : null,
      source: 'operational_plan'
    });
  }

  return { triggers, alerts, recommended_actions };
}

/**
 * Efeitos secundários não bloqueantes: logs estruturados + registo estratégico leve (sem PII).
 *
 * @param {object} params
 * @param {string} [params.companyId]
 * @param {string} [params.userId]
 * @param {object} params.evaluation — saída de evaluateOperationalDecisions
 * @param {string} [params.source] — etiqueta de proveniência (ex.: data_retrieval:operational_overview)
 */
function scheduleOperationalDecisionSignals({ companyId, userId, evaluation, source } = {}) {
  const ev = evaluation && typeof evaluation === 'object' ? evaluation : {};
  const trigN = Array.isArray(ev.triggers) ? ev.triggers.length : 0;
  const alN = Array.isArray(ev.alerts) ? ev.alerts.length : 0;
  const recN = Array.isArray(ev.recommended_actions) ? ev.recommended_actions.length : 0;

  const tags = [source != null ? String(source) : 'operational_decision_engine'];
  if (Array.isArray(ev.triggers)) {
    for (const t of ev.triggers.slice(0, 6)) {
      if (t && t.id) {
        tags.push(String(t.id));
      }
    }
  }

  const payload = {
    company_id: companyId || null,
    user_id: userId || null,
    source: source || null,
    triggers: trigN,
    alerts: alN,
    recommended_actions: recN,
    alert_codes: (ev.alerts || []).map((a) => a && a.code).filter(Boolean)
  };

  try {
    console.warn('[OPERATIONAL_DECISION_ENGINE]', JSON.stringify(payload));
  } catch (err) {
    console.warn('[OPERATIONAL_DECISION_ENGINE]', payload, err?.message ?? err);
  }

  const operationalAlertsService = require('./operationalAlertsService');
  setImmediate(() => {
    operationalAlertsService
      .persistDecisionEngineAlerts(companyId, Array.isArray(ev.alerts) ? ev.alerts : [], source)
      .then((r) => {
        if (r.inserted > 0 || r.skipped > 0) {
          try {
            console.warn(
              '[OPERATIONAL_DECISION_ENGINE][alerts_db]',
              JSON.stringify({ company_id: companyId, ...r })
            );
          } catch (_) {
            /* ignore */
          }
        }
      })
      .catch((err) => {
        console.warn('[OPERATIONAL_DECISION_ENGINE][alerts_db]', err?.message ?? err);
      });
  });

  const strategicLearningService = require('./strategicLearningService');
  setImmediate(() => {
    strategicLearningService.recordDecisionTraceAsync({
      company_id: companyId,
      intent: 'operational_decision_engine',
      had_data: trigN + alN > 0,
      used_fallback: false,
      context_tags: tags.slice(0, 8)
    });
  });
}

module.exports = {
  evaluateOperationalDecisions,
  scheduleOperationalDecisionSignals
};
