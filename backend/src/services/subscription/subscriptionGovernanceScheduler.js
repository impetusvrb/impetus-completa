'use strict';

/**
 * Subscription Governance Scheduler — AUD-WORKERS-01-FIX-SUBSCRIPTION
 *
 * Internaliza checkGracePeriodAndSuspend() no processo principal (padrão Nexus billing cron).
 * Não altera regras financeiras; apenas executa a função existente em asaasService.js.
 *
 * Flag: ENABLE_SUBSCRIPTION_GOVERNANCE_CRON (default: false)
 * Cron: 0 * * * * (1x/hora) quando activo
 */

const asaasService = require('../asaasService');
const db = require('../../db');
const billingNotifications = require('./subscriptionBillingNotificationService');

const LAYER = 'SUBSCRIPTION_GOVERNANCE';

/** @type {{ enabled: boolean, lastExecution: string|null, lastSuccess: string|null, lastError: string|null, lastMetrics: object|null }} */
const _status = {
  enabled: false,
  lastExecution: null,
  lastSuccess: null,
  lastError: null,
  lastMetrics: null
};

function isEnabled() {
  return String(process.env.ENABLE_SUBSCRIPTION_GOVERNANCE_CRON || '').toLowerCase() === 'true';
}

function _log(event, data = {}) {
  try {
    console.info('[SUBSCRIPTION_GOVERNANCE]', JSON.stringify({
      _type: 'subscription_governance',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      ...data
    }));
  } catch {
    /* never throw from logging */
  }
}

/**
 * Contagem read-only de candidatos à suspensão (mesmo predicado que asaasService.checkGracePeriodAndSuspend).
 * Observabilidade apenas — não altera estado.
 */
async function _countGraceExpiredCandidates() {
  const result = await db.query(`
    SELECT COUNT(*)::int AS n
    FROM subscriptions s
    WHERE s.status = 'overdue'
      AND s.overdue_since_date IS NOT NULL
      AND s.overdue_since_date + (s.grace_period_days || ' days')::interval < now()
  `);
  return result.rows[0]?.n ?? 0;
}

/**
 * Ciclo único de governança de assinaturas.
 * @returns {Promise<{ ok: boolean, processed_subscriptions?: number, suspended_subscriptions?: number, execution_ms?: number, error?: string }>}
 */
async function runSubscriptionGovernanceCycle() {
  const startedMs = Date.now();
  _status.lastExecution = new Date().toISOString();

  _log('subscription_governance_cycle_started');

  let processed = 0;
  let suspended = 0;
  let billingMetrics = null;

  try {
    billingMetrics = await billingNotifications.processBillingNotifications();
    processed = await _countGraceExpiredCandidates();
    await asaasService.checkGracePeriodAndSuspend();
    suspended = processed;

    const execution_ms = Date.now() - startedMs;
    _status.lastSuccess = new Date().toISOString();
    _status.lastError = null;
    _status.lastMetrics = {
      processed_subscriptions: processed,
      suspended_subscriptions: suspended,
      execution_ms,
      billing_notifications: billingMetrics
    };

    _log('subscription_governance_cycle_finished', {
      processed_subscriptions: processed,
      suspended_subscriptions: suspended,
      execution_ms,
      billing_notifications: billingMetrics
    });

    return {
      ok: true,
      processed_subscriptions: processed,
      suspended_subscriptions: suspended,
      execution_ms,
      billing_notifications: billingMetrics
    };
  } catch (err) {
    const execution_ms = Date.now() - startedMs;
    const message = err?.message || String(err);
    _status.lastError = message;
    _status.lastMetrics = {
      processed_subscriptions: processed,
      suspended_subscriptions: 0,
      execution_ms,
      billing_notifications: billingMetrics
    };

    _log('subscription_governance_cycle_failed', {
      error: message,
      processed_subscriptions: processed,
      execution_ms
    });

    return { ok: false, error: message, execution_ms };
  }
}

/**
 * Inicia cron horário se flag activa.
 * @param {(task: import('node-cron').ScheduledTask) => void} [registerTask] — registo para shutdown gracioso
 * @returns {import('node-cron').ScheduledTask|null}
 */
function startSubscriptionGovernanceCron(registerTask) {
  if (!isEnabled()) {
    _status.enabled = false;
    return null;
  }

  const cron = require('node-cron');
  const tz = process.env.TZ || 'America/Sao_Paulo';

  const task = cron.schedule(
    '0 * * * *',
    () => {
      runSubscriptionGovernanceCycle().catch((e) => {
        console.error('[SUBSCRIPTION_GOVERNANCE_CRON]', e?.message || e);
      });
    },
    { timezone: tz }
  );

  _status.enabled = true;

  if (typeof registerTask === 'function') {
    try {
      registerTask(task);
    } catch {
      /* ignore */
    }
  }

  console.log(`[server] Subscription governance cron: hourly (${tz}) — ENABLE_SUBSCRIPTION_GOVERNANCE_CRON=true`);
  return task;
}

/**
 * Estado operacional para auditoria / suporte (sem dados de tenant).
 */
function getStatus() {
  return {
    enabled: _status.enabled,
    flag_active: isEnabled(),
    last_execution: _status.lastExecution,
    last_success: _status.lastSuccess,
    last_error: _status.lastError,
    last_metrics: _status.lastMetrics
  };
}

module.exports = {
  runSubscriptionGovernanceCycle,
  startSubscriptionGovernanceCron,
  getStatus,
  isEnabled,
  LAYER
};
