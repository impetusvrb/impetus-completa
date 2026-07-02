/**
 * CERT-PULSE-02 — Hooks aditivos (fire-and-forget). Não altera fluxos existentes.
 */
'use strict';

const eventIngestion = require('./eventIngestion');

function enabled() {
  return process.env.IMPETUS_PULSE_COGNITIVE !== 'off';
}

/**
 * Notifica evento humano sem bloquear o caller.
 */
function notifyHumanEvent(companyId, event = {}) {
  if (!enabled() || !companyId) return;
  setImmediate(() => {
    eventIngestion.ingestHumanEvent(companyId, event).catch((err) => {
      console.warn('[pulseCognitive][hook]', err?.message || err);
    });
  });
}

function onPulseSelfEvaluationCompleted(companyId, userId, teamMemberId, meta = {}) {
  notifyHumanEvent(companyId, {
    user_id: userId || null,
    operational_team_member_id: teamMemberId || null,
    event_type: 'pulse_self_evaluation',
    event_source: 'pulse_legacy',
    payload: meta
  });
}

function onPulseSupervisorPerceptionCompleted(companyId, supervisorId, evaluationId) {
  notifyHumanEvent(companyId, {
    user_id: supervisorId,
    event_type: 'pulse_supervisor_perception',
    event_source: 'pulse_legacy',
    payload: { evaluation_id: evaluationId }
  });
}

module.exports = {
  notifyHumanEvent,
  onPulseSelfEvaluationCompleted,
  onPulseSupervisorPerceptionCompleted,
  enabled
};
