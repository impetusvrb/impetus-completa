'use strict';

/**
 * Execução controlada de efeitos a partir de operational_decisions.
 *
 * Política: apenas notificações, tarefas de revisão humana e logs estruturados.
 * Nunca: comandos em equipamentos, escrita em PLC, eliminação de dados, ou ações irreversíveis.
 */

const unifiedMessaging = require('./unifiedMessagingService');
const operationalAlertsService = require('./operationalAlertsService');
const strategicLearningService = require('./strategicLearningService');
const dashboardComposerService = require('./dashboardComposerService');
const { recordOperationalOutcome } = require('./operationalLearningService');
const { isValidUUID } = require('../utils/security');

/** Tipos de efeito que este módulo pode disparar (lista fechada). */
const SAFE_ACTION_TYPES = new Set([
  'structured_log',
  'notification',
  'review_task',
  'internal_alert',
  'scheduled_task',
  'learning_signal'
]);

const SHORT_TERM_OFFSET_MS = 72 * 60 * 60 * 1000;
const MAX_IMMEDIATE_PLAN_ALERTS = 4;
const MAX_SHORT_TERM_TASKS = 3;
const MAX_PREVENTIVE_LEARNING = 4;

/**
 * @param {unknown} p
 * @returns {string}
 */
function normPlanPriority(p) {
  return p != null ? String(p).trim().toUpperCase() : '';
}

/**
 * @param {object} context
 * @returns {{ ok: boolean, reason?: string }}
 */
function validateExecutionContext(context) {
  const ctx = context && typeof context === 'object' ? context : {};
  const user = ctx.user;
  const companyId =
    ctx.companyId != null && String(ctx.companyId).trim() !== ''
      ? String(ctx.companyId).trim()
      : user && user.company_id != null
        ? String(user.company_id).trim()
        : '';

  if (!user || typeof user !== 'object' || !user.id) {
    return { ok: false, reason: 'missing_user' };
  }
  if (!companyId || !user.company_id || String(user.company_id).trim() !== companyId) {
    return { ok: false, reason: 'company_mismatch_or_missing_company' };
  }
  return { ok: true };
}

/**
 * @param {string} event
 * @param {object} detail
 */
function logStructured(event, detail) {
  try {
    console.warn(
      '[OPERATIONAL_ACTION_EXECUTOR]',
      JSON.stringify({
        event,
        ts: new Date().toISOString(),
        ...detail
      })
    );
  } catch (_err) {
    console.warn('[OPERATIONAL_ACTION_EXECUTOR]', event, detail);
  }
}

/**
 * @param {string} companyId
 * @param {string|null|undefined} assigneeUserId
 * @param {string} title
 * @param {string} description
 * @param {string|null|undefined} scheduledAtIso
 * @returns {Promise<string|null>}
 */
async function insertReviewTask(companyId, assigneeUserId, title, description, scheduledAtIso = null) {
  const db = require('../db');
  const t = String(title || '').slice(0, 500);
  const d = description != null ? String(description).slice(0, 8000) : null;
  let sched = null;
  if (scheduledAtIso != null) {
    const dt = new Date(scheduledAtIso);
    if (!Number.isNaN(dt.getTime())) {
      sched = dt.toISOString();
    }
  }
  try {
    const r = await db.query(
      `INSERT INTO tasks (company_id, title, description, status, assignee, assigned_to, scheduled_at)
       VALUES ($1, $2, $3, 'open', $4, $5, $6)
       RETURNING id`,
      [companyId, t, d, assigneeUserId ? null : 'Equipe', assigneeUserId || null, sched]
    );
    return r.rows?.[0]?.id ? String(r.rows[0].id) : null;
  } catch (err) {
    if (err.message && err.message.includes('assigned_to')) {
      const r = await db.query(
        `INSERT INTO tasks (company_id, title, description, status, assignee, scheduled_at)
         VALUES ($1, $2, $3, 'open', $4, $5)
         RETURNING id`,
        [companyId, t, d, assigneeUserId ? 'Responsável técnico' : 'Equipe', sched]
      );
      return r.rows?.[0]?.id ? String(r.rows[0].id) : null;
    }
    throw err;
  }
}

/**
 * Efeitos do operational_plan (alertas internos, tarefas agendadas, sinais de aprendizagem).
 * @param {object} plan
 * @param {object} context
 * @param {{ companyId: string, user: object }} scope
 * @param {object[]} executed
 * @param {object[]} skipped
 * @param {object[]} errors
 */
async function applyOperationalPlanHorizons(plan, context, scope, executed, skipped, errors) {
  const { companyId, user } = scope;
  const uid = user && user.id != null ? String(user.id) : '';

  const immediate = Array.isArray(plan.immediate_actions) ? plan.immediate_actions : [];
  const urgent = immediate
    .filter((a) => {
      const pr = normPlanPriority(a && a.priority);
      return pr === 'CRITICAL' || pr === 'HIGH';
    })
    .slice(0, MAX_IMMEDIATE_PLAN_ALERTS);

  for (const a of urgent) {
    try {
      const pr = normPlanPriority(a && a.priority);
      const sev = pr === 'CRITICAL' ? 'alta' : 'alta';
      const mid = a && a.machine_id != null ? String(a.machine_id).trim() : '';
      const alertId = await operationalAlertsService.createPlanningDerivedAlert(companyId, {
        tipo_alerta: 'plano_imediato',
        titulo: `Plano imediato (${pr}): ${String(a.action || 'ação').slice(0, 120)}`,
        mensagem: [a.reason != null ? String(a.reason) : '', mid ? `Ativo: ${mid}` : '']
          .filter(Boolean)
          .join('\n')
          .slice(0, 3800),
        severidade: sev,
        metadata: {
          horizon: 'immediate',
          priority: pr,
          machine_id: mid || null,
          source: context.sourceTag || null,
          intent: context.intent || null
        }
      });
      if (alertId) {
        executed.push({ type: 'internal_alert', meta: { alert_id: alertId, horizon: 'immediate' } });
        logStructured('plan_immediate_alert', {
          company_id: companyId,
          user_id: uid,
          alert_id: alertId,
          machine_id: mid || null
        });
      }
    } catch (err) {
      errors.push({
        operation: 'plan_immediate_alert',
        message: err && err.message ? err.message : String(err)
      });
    }
  }
  if (!urgent.length) {
    skipped.push({ reason: 'no_immediate_plan_actions_urgent' });
  }

  const shortList = Array.isArray(plan.short_term_actions) ? plan.short_term_actions : [];
  const dueIso = new Date(Date.now() + SHORT_TERM_OFFSET_MS).toISOString();
  let shortCreated = 0;
  for (const a of shortList.slice(0, MAX_SHORT_TERM_TASKS)) {
    try {
      const mid = a && a.machine_id != null ? String(a.machine_id).trim() : '';
      const title = `[Curto prazo] ${String(a.action || 'Ação planead').slice(0, 200)}`;
      const body = [a.reason != null ? String(a.reason) : '', mid ? `Ativo: ${mid}` : ''].filter(Boolean).join('\n');
      const taskId = await insertReviewTask(companyId, user.id, title, body, dueIso);
      if (taskId) {
        shortCreated += 1;
        executed.push({
          type: 'scheduled_task',
          meta: { task_id: taskId, horizon: 'short_term', scheduled_at: dueIso }
        });
        logStructured('plan_short_term_task', {
          company_id: companyId,
          user_id: uid,
          task_id: taskId
        });
      }
    } catch (err) {
      errors.push({
        operation: 'plan_short_term_task',
        message: err && err.message ? err.message : String(err)
      });
    }
  }
  if (!shortList.length) {
    skipped.push({ reason: 'no_short_term_plan_actions' });
  } else if (shortCreated === 0) {
    skipped.push({ reason: 'short_term_tasks_none_created' });
  }

  const prevList = Array.isArray(plan.preventive_actions) ? plan.preventive_actions : [];
  const prevSample = prevList.slice(0, MAX_PREVENTIVE_LEARNING);
  if (prevSample.length) {
    const tags = prevSample
      .map((a, i) => {
        const mid = a && a.machine_id != null ? String(a.machine_id).trim().slice(0, 24) : '';
        return `prev_${i}_${mid || 'na'}`;
      })
      .slice(0, 8);
    strategicLearningService.recordDecisionTraceAsync({
      company_id: companyId,
      intent: 'operational_plan_preventive',
      had_data: true,
      used_fallback: false,
      context_tags: tags
    });
    executed.push({
      type: 'learning_signal',
      meta: { kind: 'strategic_learning_preventive', items: prevSample.length }
    });
    try {
      await dashboardComposerService.recordInteraction(uid, companyId, 'operational_plan_preventive', 'plan', null, {
        count: prevSample.length,
        machines: prevSample.map((a) => a.machine_id).filter(Boolean).slice(0, 16),
        source: context.sourceTag || null,
        intent: context.intent || null
      });
    } catch (err) {
      errors.push({
        operation: 'dashboard_record_preventive',
        message: err && err.message ? err.message : String(err)
      });
    }
    for (const a of prevSample) {
      const mid = a && a.machine_id != null ? String(a.machine_id).trim() : '';
      if (mid && isValidUUID(mid)) {
        try {
          recordOperationalOutcome({
            action: {
              machine_id: mid,
              action_type: 'preventive_plan_hint'
            },
            result: { success: null, confidence: 'plan_oriented' },
            company_id: companyId
          });
        } catch (_e) {
          /* memória apenas; ignorar falhas pontuais */
        }
      }
    }
    logStructured('plan_preventive_learning', {
      company_id: companyId,
      user_id: uid,
      items: prevSample.length
    });
  } else {
    skipped.push({ reason: 'no_preventive_plan_actions' });
  }
}

/**
 * @param {object} evaluation — saída de evaluateOperationalDecisions: triggers, alerts, recommended_actions
 * @param {object} context
 * @param {{ id?: string, company_id?: string }|null|undefined} [context.user]
 * @param {string} [context.companyId]
 * @param {string} [context.userId]
 * @param {string} [context.sourceTag]
 * @param {string} [context.intent]
 * @returns {Promise<{ executed: object[], skipped: object[], errors: object[] }>}
 */
async function executeOperationalActions(evaluation, context = {}) {
  const executed = [];
  const skipped = [];
  const errors = [];

  const gate = validateExecutionContext(context);
  if (!gate.ok) {
    skipped.push({ reason: 'context_not_eligible', detail: gate.reason || 'unknown' });
    logStructured('execute_skipped', {
      reason: gate.reason,
      source: context.sourceTag || null,
      intent: context.intent || null
    });
    return { executed, skipped, errors };
  }

  const user = context.user;
  const companyId = String(context.companyId || user.company_id).trim();
  const plan =
    context.operational_plan && typeof context.operational_plan === 'object' && !Array.isArray(context.operational_plan)
      ? context.operational_plan
      : null;
  const hasPlanHorizons =
    plan &&
    ((Array.isArray(plan.immediate_actions) && plan.immediate_actions.length > 0) ||
      (Array.isArray(plan.short_term_actions) && plan.short_term_actions.length > 0) ||
      (Array.isArray(plan.preventive_actions) && plan.preventive_actions.length > 0));

  const ev = evaluation && typeof evaluation === 'object' ? evaluation : {};
  const triggers = Array.isArray(ev.triggers) ? ev.triggers : [];
  const alerts = Array.isArray(ev.alerts) ? ev.alerts : [];
  const recommended = Array.isArray(ev.recommended_actions) ? ev.recommended_actions : [];
  const hasDecisionPayload = Boolean(triggers.length || alerts.length || recommended.length);

  if (!hasDecisionPayload && !hasPlanHorizons) {
    skipped.push({ reason: 'empty_evaluation' });
    logStructured('execute_skipped', {
      reason: 'empty_evaluation',
      company_id: companyId,
      user_id: user.id,
      source: context.sourceTag || null
    });
    return { executed, skipped, errors };
  }

  if (hasDecisionPayload) {
    logStructured('evaluation_received', {
      company_id: companyId,
      user_id: user.id,
      source: context.sourceTag || null,
      intent: context.intent || null,
      trigger_count: triggers.length,
      alert_count: alerts.length,
      recommended_count: recommended.length
    });
    executed.push({
      type: 'structured_log',
      action: 'evaluation_received',
      meta: { triggers: triggers.length, alerts: alerts.length, recommended: recommended.length }
    });

    skipped.push({
      reason: 'recommended_actions_suggestion_only',
      detail: `${recommended.length} item(ns) em recommended_actions (decisões) não são executados automaticamente (política de segurança).`
    });

    const suggestionAlerts = alerts.filter(
      (a) =>
        a &&
        typeof a === 'object' &&
        (!a.kind || String(a.kind) === 'suggestion_only')
    );

    const highAlerts = suggestionAlerts.filter((a) => String(a.severity || '').toLowerCase() === 'high');
    if (highAlerts.length) {
      const lines = highAlerts
        .slice(0, 5)
        .map((a) => (a.message != null ? String(a.message) : String(a.code || '')))
        .filter(Boolean);
      const body = `[Decisão operacional]\n${lines.join('\n')}`.slice(0, 3800);
      try {
        const send = await unifiedMessaging.sendToUser(companyId, user.id, body, {
          type: 'operational_decision'
        });
        if (send.ok) {
          executed.push({
            type: 'notification',
            meta: { severity: 'high', count: highAlerts.length, notificationId: send.notificationId }
          });
          logStructured('notification_sent', {
            company_id: companyId,
            user_id: user.id,
            alert_codes: highAlerts.map((a) => a.code).filter(Boolean),
            count: highAlerts.length
          });
        } else {
          errors.push({
            operation: 'notification',
            message: send.error || 'Falha ao enviar notificação'
          });
        }
      } catch (err) {
        errors.push({
          operation: 'notification',
          message: err && err.message ? err.message : String(err)
        });
      }
    } else if (String(context.sourceTag) === 'autonomous_execution') {
      const softAlerts = suggestionAlerts
        .filter((a) => {
          const sev = String(a.severity || '').toLowerCase();
          return sev === 'low' || sev === 'medium';
        })
        .slice(0, 2);
      if (softAlerts.length) {
        const lines = softAlerts
          .map((a) => (a.message != null ? String(a.message) : String(a.code || '')))
          .filter(Boolean);
        const body = `[Autonomia supervisionada]\n${lines.join('\n')}`.slice(0, 3800);
        try {
          const send = await unifiedMessaging.sendToUser(companyId, user.id, body, {
            type: 'autonomous_suggestion'
          });
          if (send.ok) {
            executed.push({
              type: 'notification',
              meta: {
                severity: 'low',
                count: softAlerts.length,
                notificationId: send.notificationId
              }
            });
            logStructured('autonomous_notification_sent', {
              company_id: companyId,
              user_id: user.id,
              alert_codes: softAlerts.map((a) => a.code).filter(Boolean),
              count: softAlerts.length
            });
          } else {
            errors.push({
              operation: 'notification',
              message: send.error || 'Falha ao enviar notificação (autonomia)'
            });
          }
        } catch (err) {
          errors.push({
            operation: 'notification',
            message: err && err.message ? err.message : String(err)
          });
        }
      } else {
        skipped.push({ reason: 'autonomous_no_soft_alerts' });
      }
    } else {
      skipped.push({ reason: 'no_high_severity_notifications' });
    }

    const criticalPlanAlert =
      String(context.sourceTag) === 'autonomous_execution'
        ? null
        : suggestionAlerts.find((a) => a && String(a.code) === 'IMMEDIATE_CRITICAL');
    if (criticalPlanAlert) {
      try {
        const taskId = await insertReviewTask(
          companyId,
          user.id,
          'Revisão humana obrigatória: plano com ações CRITICAL',
          [
            'O motor de decisão detetou ações imediatas CRITICAL no plano operacional.',
            'Confirmar em campo antes de qualquer execução em equipamentos.',
            criticalPlanAlert.message != null ? String(criticalPlanAlert.message) : ''
          ]
            .filter(Boolean)
            .join('\n')
        );
        if (taskId) {
          executed.push({ type: 'review_task', meta: { task_id: taskId, code: 'IMMEDIATE_CRITICAL' } });
          logStructured('review_task_created', {
            company_id: companyId,
            assignee_id: user.id,
            task_id: taskId,
            code: 'IMMEDIATE_CRITICAL'
          });
        } else {
          skipped.push({ reason: 'task_insert_returned_null', detail: 'IMMEDIATE_CRITICAL' });
        }
      } catch (err) {
        errors.push({
          operation: 'review_task',
          message: err && err.message ? err.message : String(err)
        });
      }
    } else {
      skipped.push({ reason: 'no_immediate_critical_task' });
    }
  } else {
    logStructured('plan_horizons_without_decision_payload', {
      company_id: companyId,
      user_id: user.id,
      source: context.sourceTag || null,
      intent: context.intent || null
    });
    executed.push({
      type: 'structured_log',
      action: 'plan_only_context',
      meta: { has_plan: Boolean(hasPlanHorizons) }
    });
  }

  if (hasPlanHorizons) {
    try {
      await applyOperationalPlanHorizons(plan, context, { companyId, user }, executed, skipped, errors);
    } catch (err) {
      errors.push({
        operation: 'operational_plan_horizons',
        message: err && err.message ? err.message : String(err)
      });
    }
  }

  logStructured('execute_summary', {
    company_id: companyId,
    user_id: user.id,
    executed_types: executed.map((e) => e.type),
    safe_action_types: Array.from(SAFE_ACTION_TYPES)
  });

  return { executed, skipped, errors };
}

module.exports = {
  executeOperationalActions,
  validateExecutionContext,
  SAFE_ACTION_TYPES
};
