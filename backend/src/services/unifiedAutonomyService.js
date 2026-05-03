'use strict';

/**
 * Autonomia supervisionada com rollback seguro (somente efeitos reversíveis).
 * Não altera operationalDecisionEngine, não comanda PLC, não remove o executor existente.
 */

const operationalDecisionEngine = require('./operationalDecisionEngine');
const { executeOperationalActions } = require('./operationalActionExecutor');
const unifiedLearningFeedbackService = require('./unifiedLearningFeedbackService');
const db = require('../db');

const ROLLBACK_MS = Math.max(
  5000,
  parseInt(String(process.env.UNIFIED_AUTONOMY_ROLLBACK_MS || '30000'), 10) || 30000
);

const DESTRUCTIVE_RE = /\bplc\b|shutdown|desligar\s+(a\s+)?máquina|comando\s+direto|parada\s+forçada|ijrm\b/i;

/**
 * @param {object} ev
 * @returns {{ triggers: object[], alerts: object[], recommended_actions: object[] }}
 */
function filterAutonomyEvaluation(ev) {
  const alerts = Array.isArray(ev?.alerts) ? ev.alerts : [];
  const safe = [];
  for (const a of alerts) {
    if (!a || typeof a !== 'object') continue;
    if (String(a.kind || 'suggestion_only') !== 'suggestion_only') continue;
    const sev = String(a.severity || '').toLowerCase();
    if (sev === 'high' || sev === 'critical') continue;
    if (String(a.code || '') === 'IMMEDIATE_CRITICAL') continue;
    safe.push(a);
  }
  return {
    triggers: [],
    alerts: safe.slice(0, 4),
    recommended_actions: []
  };
}

/**
 * @param {string|null|undefined} decisionId
 * @param {string|null|undefined} companyId
 * @returns {boolean}
 */
function detectNegativeOutcome(decisionId, companyId) {
  const did = decisionId != null ? String(decisionId) : '';
  if (!did) return false;
  const row = unifiedLearningFeedbackService.getLastOutcomeRowForDecision(companyId, did);
  if (!row) return false;
  if (row.outcome === 'bad') return true;
  if (row.fallback === true) return true;
  return false;
}

/**
 * @param {object} rollback_context
 */
async function rollbackOperationalAction(rollback_context) {
  const ctx = rollback_context && typeof rollback_context === 'object' ? rollback_context : {};
  const companyId = ctx.company_id != null ? String(ctx.company_id).trim() : '';
  const recipientUserId = ctx.recipient_user_id != null ? String(ctx.recipient_user_id).trim() : '';
  const task_ids = Array.isArray(ctx.task_ids) ? ctx.task_ids : [];
  const alert_ids = Array.isArray(ctx.alert_ids) ? ctx.alert_ids : [];
  const notification_ids = Array.isArray(ctx.notification_ids) ? ctx.notification_ids : [];
  if (!companyId) return;

  if (task_ids.length && recipientUserId) {
    try {
      await db.query(
        `
        UPDATE tasks
        SET status = 'cancelled'
        WHERE id = ANY($1::uuid[])
          AND company_id = $2::uuid
          AND (assigned_to IS NULL OR assigned_to = $3::uuid)
          AND COALESCE(status, 'open') NOT IN ('done', 'completed', 'closed', 'cancelled', 'rejected')
        `,
        [task_ids, companyId, recipientUserId]
      );
    } catch (_e) {}
  } else if (task_ids.length) {
    try {
      await db.query(
        `
        UPDATE tasks
        SET status = 'cancelled'
        WHERE id = ANY($1::uuid[])
          AND company_id = $2::uuid
          AND COALESCE(status, 'open') NOT IN ('done', 'completed', 'closed', 'cancelled', 'rejected')
        `,
        [task_ids, companyId]
      );
    } catch (_e) {}
  }

  if (alert_ids.length) {
    try {
      await db.query(
        `
        UPDATE operational_alerts
        SET resolvido = true, resolvido_em = now(), resolvido_por = NULL
        WHERE id = ANY($1::uuid[])
          AND company_id = $2::uuid
          AND COALESCE(resolvido, false) = false
        `,
        [alert_ids, companyId]
      );
    } catch (_e) {}
  }

  if (notification_ids.length && recipientUserId) {
    try {
      await db.query(
        `
        UPDATE app_notifications
        SET read_at = COALESCE(read_at, now())
        WHERE id = ANY($1::uuid[])
          AND company_id = $2::uuid
          AND recipient_id = $3::uuid
        `,
        [notification_ids, companyId, recipientUserId]
      );
    } catch (notifErr) {
      try {
        if (notifErr && String(notifErr.message || '').includes('company_id')) {
          await db.query(
            `
            UPDATE app_notifications
            SET read_at = COALESCE(read_at, now())
            WHERE id = ANY($1::uuid[])
              AND recipient_id = $2::uuid
            `,
            [notification_ids, recipientUserId]
          );
        }
      } catch (_e2) {}
    }
  }
}

/**
 * @param {object} params
 * @param {object} [params.decision]
 * @param {number} [params.score]
 * @param {object} [params.systemInfluence]
 * @param {object} [params.context]
 * @param {object|null} [params.context.user]
 * @param {string|null} [params.context.companyId]
 * @param {string} [params.context.decisionId]
 * @param {object} [params.context.temporalInsights]
 * @param {string} [params.context.source]
 */
async function evaluateAutonomousExecution({ decision, score, systemInfluence, context } = {}) {
  const noop = { skipped: true, reason: 'disabled' };
  if (process.env.UNIFIED_AUTONOMY_ENABLED !== 'true') {
    try {
      console.info('[UNIFIED_AUTONOMY_SKIPPED]', JSON.stringify({ reason: 'UNIFIED_AUTONOMY_ENABLED_false' }));
    } catch (_l) {}
    return noop;
  }

  const ctx = context && typeof context === 'object' ? context : {};
  const user = ctx.user && typeof ctx.user === 'object' ? ctx.user : null;
  const companyIdRaw = ctx.companyId != null ? ctx.companyId : user?.company_id;
  const decisionId = ctx.decisionId != null ? String(ctx.decisionId) : '';

  const logSkip = (reason, detail = {}) => {
    try {
      console.info('[UNIFIED_AUTONOMY_SKIPPED]', JSON.stringify({ reason, decisionId, ...detail }));
    } catch (_e) {}
  };

  if (!user?.id || !companyIdRaw) {
    logSkip('missing_user_or_company');
    return { skipped: true, reason: 'missing_user_or_company' };
  }
  if (!decisionId) {
    logSkip('missing_decision_id');
    return { skipped: true, reason: 'missing_decision_id' };
  }

  const companyIdStr = String(companyIdRaw).trim();
  const s = Number(score);
  const si = systemInfluence && typeof systemInfluence === 'object' ? systemInfluence : {};
  const rl = String(si.risk_level || '').toLowerCase();

  if (!Number.isFinite(s) || s <= 0.85) {
    logSkip('score_gate', { score: s });
    return { skipped: true, reason: 'score_gate' };
  }
  if (rl === 'high' || rl === 'critical') {
    logSkip('risk_gate', { risk_level: rl });
    return { skipped: true, reason: 'risk_gate' };
  }

  const strict = process.env.UNIFIED_AUTONOMY_STRICT_INFLUENCE === 'true';
  if (strict) {
    if (si.requires_attention === true) {
      logSkip('requires_attention_strict');
      return { skipped: true, reason: 'requires_attention' };
    }
    if (si.priority_override === true) {
      logSkip('priority_override_strict');
      return { skipped: true, reason: 'priority_override' };
    }
  }

  const dec = decision && typeof decision === 'object' ? decision : {};
  const blob = `${dec.label || ''} ${dec.reason || ''} ${dec.justification || ''}`;
  if (DESTRUCTIVE_RE.test(blob)) {
    logSkip('destructive_pattern');
    return { skipped: true, reason: 'destructive_pattern' };
  }

  const temporal =
    ctx.temporalInsights && typeof ctx.temporalInsights === 'object' ? ctx.temporalInsights : {};
  const plan = {
    immediate_actions: [],
    short_term_actions: [],
    preventive_actions: []
  };

  const rawEval = operationalDecisionEngine.evaluateOperationalDecisions(plan, {
    company_id: companyIdStr,
    user_id: String(user.id),
    temporal_insights: temporal,
    intent: 'unified_autonomy'
  });

  let evaluation = filterAutonomyEvaluation(rawEval);
  if (!evaluation.alerts.length) {
    evaluation = {
      triggers: [],
      alerts: [
        {
          kind: 'suggestion_only',
          severity: 'low',
          code: 'AUTONOMY_SAFE_ACK',
          message: `Decisão de alta confiança (${(s * 100).toFixed(1)}%): ${String(dec.label || '—').slice(0, 200)}. Autonomia supervisionada: monitorização suave.`
        }
      ],
      recommended_actions: []
    };
  }

  const execCtx = {
    user,
    companyId: companyIdStr,
    sourceTag: 'autonomous_execution',
    intent: 'unified_autonomy'
  };

  let result;
  try {
    result = await executeOperationalActions(evaluation, execCtx);
  } catch (err) {
    logSkip('execute_error', { message: err?.message ?? String(err) });
    return { skipped: true, reason: 'execute_error' };
  }

  const rollback_context = {
    company_id: companyIdStr,
    recipient_user_id: String(user.id),
    task_ids: [],
    alert_ids: [],
    notification_ids: []
  };

  for (const e of result.executed || []) {
    if (!e || typeof e !== 'object') continue;
    const m = e.meta && typeof e.meta === 'object' ? e.meta : {};
    if (m.task_id) rollback_context.task_ids.push(String(m.task_id));
    if (m.alert_id) rollback_context.alert_ids.push(String(m.alert_id));
    if (m.notificationId) rollback_context.notification_ids.push(String(m.notificationId));
  }

  const nEffects =
    rollback_context.task_ids.length +
    rollback_context.alert_ids.length +
    rollback_context.notification_ids.length;

  if (nEffects === 0) {
    logSkip('no_reversible_effects');
    return { skipped: true, reason: 'no_reversible_effects' };
  }

  try {
    console.info(
      '[UNIFIED_AUTONOMY_EXECUTED]',
      JSON.stringify({
        decisionId,
        companyId: companyIdStr,
        executed_types: (result.executed || []).map((x) => x.type),
        rollback_context: {
          task_ids: rollback_context.task_ids,
          alert_ids: rollback_context.alert_ids,
          notification_ids: rollback_context.notification_ids
        }
      })
    );
  } catch (_log) {}

  setTimeout(() => {
    (async () => {
      try {
        const neg = detectNegativeOutcome(decisionId, companyIdStr);
        if (neg) {
          await rollbackOperationalAction(rollback_context);
          console.warn('[UNIFIED_AUTONOMY_ROLLBACK]', JSON.stringify({ decisionId, companyId: companyIdStr }));
        }
      } catch (_e) {
        try {
          console.warn(
            '[UNIFIED_AUTONOMY_ROLLBACK]',
            JSON.stringify({ decisionId, companyId: companyIdStr, error: 'rollback_failed' })
          );
        } catch (_l) {}
      }
    })().catch(() => {});
  }, ROLLBACK_MS);

  return { skipped: false, executed: result.executed, rollback_context };
}

module.exports = {
  evaluateAutonomousExecution,
  detectNegativeOutcome,
  rollbackOperationalAction,
  __test: { filterAutonomyEvaluation, ROLLBACK_MS }
};
