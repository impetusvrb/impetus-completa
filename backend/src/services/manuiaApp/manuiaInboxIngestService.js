/**
 * Orquestração: evento → decisão (preferências + plantão) → inbox (+ push opcional).
 * Não envia dados entre empresas; sempre filtra por companyId + userId alvo.
 */
'use strict';

const repo = require('./manuiaAppRepository');
const decision = require('./manuiaAlertDecisionService');
const aiSummary = require('./manuiaAiSummaryService');
const webPush = require('./manuiaWebPushService');

function wantPushAfterIngest() {
  return String(process.env.MANUIA_WEB_PUSH_ON_INGEST || '').toLowerCase() === 'true';
}

/**
 * Execução legada de ingest (inbox + push opcional) — usado pelo adapter EG-10.
 * @param {object} opts
 */
async function executeLegacyIngest(opts) {
  const {
    companyId,
    userId,
    eventType = 'generic',
    severity = 'medium',
    title,
    body = null,
    payload = {},
    machineId = null,
    workOrderId = null,
    requiresAck = false
  } = opts;

  if (!companyId || !userId || !title) {
    throw new Error('ingestForUser: companyId, userId e title são obrigatórios');
  }

  let prefs = await repo.getPreferences(companyId, userId).catch(() => null);
  if (!prefs) prefs = {};

  const userOnCall =
    !!prefs.on_call || (await repo.isUserOnCallNow(companyId, userId, new Date()));

  const decisionResult = decision.decideAlertDelivery({
    eventType,
    severity,
    prefs,
    userOnCall
  });

  const alertLevel = decisionResult.alertLevel || decision.mapSeverityToAlertLevel(severity);

  const row = await repo.insertInboxNotification({
    company_id: companyId,
    user_id: userId,
    source: opts.source || 'system',
    severity: String(severity).slice(0, 32),
    alert_level: alertLevel,
    title: String(title).slice(0, 500),
    body: body != null ? String(body).slice(0, 4000) : null,
    payload,
    machine_id: machineId,
    work_order_id: workOrderId,
    requires_ack: !!requiresAck
  });

  const ch = decisionResult.delivery?.channel || '';
  const skipPushChannel = ['inbox_only', 'deferred', 'queue_next_shift', 'none'].includes(ch);

  let pushResult = null;
  if (
    wantPushAfterIngest() &&
    prefs.push_enabled !== false &&
    decisionResult.delivery?.deliver &&
    !skipPushChannel
  ) {
    const copy = await aiSummary.buildNotificationCopyAsync(
      {
        title,
        machineName: payload.machineName,
        sector: payload.sector,
        riskPct: payload.riskPct,
        suggestion: payload.suggestion,
        workOrderCode: payload.workOrderCode
      },
      { companyId }
    );
    pushResult = await webPush.sendJsonToUserDevices(companyId, userId, {
      title: copy.title,
      body: copy.body,
      tag: 'manuia-inbox',
      data: { notification_id: row.id, url: '/app/manutencao/manuia-app' }
    });
  }

  return { row, decision: decisionResult, push: pushResult };
}

/**
 * EG-10 — delega distribuição ao adapter (shadow/migrado) com fallback legado.
 * @param {object} opts
 */
async function _dispatchManuiaIngest(opts) {
  try {
    const adapter = require('../governanceAdapters/manuiaGovernanceAdapter');
    const dispatch = await adapter.dispatchManuiaNotification(opts);
    if (dispatch.mode === 'governance' && dispatch.distribution?.success) {
      return dispatch.distribution.result;
    }
    if (dispatch.useLegacy !== false) {
      return executeLegacyIngest(opts);
    }
    throw new Error(dispatch.reason || 'dispatch_failed');
  } catch (err) {
    console.warn('[MANUIA_INBOX][governance_dispatch]', err?.message ?? err);
    try {
      return executeLegacyIngest(opts);
    } catch (fallbackErr) {
      console.error('[MANUIA_INBOX][legacy_fallback]', fallbackErr?.message ?? fallbackErr);
      throw fallbackErr;
    }
  }
}

/**
 * Regista uma notificação na caixa do utilizador e aplica regras de entrega.
 * @param {object} opts
 * @param {string} opts.companyId
 * @param {string} opts.userId — destinatário (técnico)
 * @param {string} [opts.eventType]
 * @param {string} [opts.severity]
 * @param {string} opts.title
 * @param {string} [opts.body]
 * @param {object} [opts.payload]
 * @param {string} [opts.machineId]
 * @param {string} [opts.workOrderId]
 * @param {boolean} [opts.requiresAck]
 */
async function ingestForUser(opts) {
  const {
    companyId,
    userId,
    eventType = 'generic',
    severity = 'medium',
    title,
    body = null,
    payload = {},
    machineId = null,
    workOrderId = null,
    requiresAck = false
  } = opts;

  if (!companyId || !userId || !title) {
    throw new Error('ingestForUser: companyId, userId e title são obrigatórios');
  }

  return _dispatchManuiaIngest({
    companyId,
    userId,
    eventType,
    severity,
    title,
    body,
    payload,
    machineId,
    workOrderId,
    requiresAck,
    source: opts.source || 'system'
  });
}

async function notifyUserForWorkOrderCreated({ companyId, userId, workOrderId, woTitle, machineName }) {
  return ingestForUser({
    companyId,
    userId,
    eventType: 'work_order_created',
    severity: 'normal',
    title: `OS criada: ${(woTitle || 'Manutenção').slice(0, 200)}`,
    body: machineName ? `Equipamento: ${machineName}` : null,
    payload: { work_order_id: workOrderId, machineName },
    workOrderId,
    requiresAck: false,
    source: 'manuia_session'
  });
}

module.exports = {
  ingestForUser,
  executeLegacyIngest,
  notifyUserForWorkOrderCreated
};
