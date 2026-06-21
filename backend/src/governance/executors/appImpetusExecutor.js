'use strict';

/**
 * EVENT-GOVERNANCE-03 — executor App Impetus.
 * Reutiliza appImpetusService.sendMessage().
 */

const EXECUTOR_ID = 'appImpetusExecutor';

async function execute(context) {
  const { companyId, payload = {}, recipients = [], dryRun } = context;

  if (!companyId) {
    return { ok: false, executor: EXECUTOR_ID, error: 'companyId obrigatório' };
  }

  const phone =
    payload.phone ||
    payload.recipientPhone ||
    recipients.find((r) => r.phone)?.phone;

  const message = String(payload.message || payload.text || '').trim();
  if (!message) {
    return { ok: false, executor: EXECUTOR_ID, error: 'message obrigatório' };
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      executor: EXECUTOR_ID,
      channel: 'app_impetus',
      preview: { companyId, phone: phone ? '***' : null, messageLength: message.length }
    };
  }

  if (!phone) {
    return { ok: false, executor: EXECUTOR_ID, error: 'phone obrigatório' };
  }

  const appImpetusService = require('../../services/appImpetusService');
  const result = await appImpetusService.sendMessage(companyId, phone, message, {
    originatedFrom: payload.originatedFrom || 'event_governance'
  });

  return {
    ok: result.ok === true,
    executor: EXECUTOR_ID,
    channel: 'app_impetus',
    result
  };
}

module.exports = {
  EXECUTOR_ID,
  execute
};
