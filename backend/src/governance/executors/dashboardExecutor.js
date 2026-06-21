'use strict';

/**
 * EVENT-GOVERNANCE-03 — executor Dashboard.
 * Reutiliza operationalAlertsService.createPlanningDerivedAlert().
 */

const EXECUTOR_ID = 'dashboardExecutor';

const SEVERITY_MAP = {
  info: 'baixa',
  low: 'baixa',
  medium: 'media',
  high: 'alta',
  critical: 'alta'
};

async function execute(context) {
  const { companyId, payload = {}, decisionRef = {}, dryRun } = context;

  if (!companyId) {
    return { ok: false, executor: EXECUTOR_ID, error: 'companyId obrigatório' };
  }

  const titulo = String(payload.title || payload.titulo || decisionRef.eventType || 'Evento de governança').slice(
    0,
    500
  );
  const mensagem = String(payload.message || payload.text || payload.mensagem || '').slice(0, 4000);
  const severidade =
    payload.severidade ||
    SEVERITY_MAP[String(decisionRef.severity || 'medium').toLowerCase()] ||
    'media';

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      executor: EXECUTOR_ID,
      channel: 'dashboard',
      preview: { companyId, titulo, severidade, messageLength: mensagem.length }
    };
  }

  const operationalAlertsService = require('../../services/operationalAlertsService');
  const alertId = await operationalAlertsService.createPlanningDerivedAlert(companyId, {
    tipo_alerta: payload.tipo_alerta || `event_governance:${decisionRef.policyId || 'unknown'}`,
    titulo,
    mensagem: mensagem || titulo,
    severidade,
    source: 'event_governance',
    metadata: {
      event_id: decisionRef.eventId || null,
      policy_id: decisionRef.policyId || null,
      escalation_level: context.escalationLevel ?? 0
    }
  });

  return {
    ok: !!alertId,
    executor: EXECUTOR_ID,
    channel: 'dashboard',
    result: { alertId }
  };
}

module.exports = {
  EXECUTOR_ID,
  execute
};
