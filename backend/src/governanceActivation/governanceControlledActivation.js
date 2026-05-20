'use strict';

/**
 * Registo canónico de canais activáveis (Fase I).
 */

const CHANNELS = {
  kpi: {
    env_flag: 'IMPETUS_KPI_GOVERNANCE',
    activation_event: 'KPI_GOVERNANCE_ACTIVATED',
    rollback_event: 'KPI_GOVERNANCE_ROLLBACK_READY',
    validate_event: 'KPI_GOVERNANCE_RUNTIME_VALIDATED',
    readiness_step: 1
  },
  summary: {
    env_flag: 'IMPETUS_SUMMARY_GOVERNANCE',
    activation_event: 'SUMMARY_GOVERNANCE_ACTIVATED',
    rollback_event: 'SUMMARY_GOVERNANCE_ROLLBACK_READY',
    readiness_step: 2
  },
  chat: {
    env_flag: 'IMPETUS_CHAT_GOVERNANCE',
    activation_event: 'CHAT_GOVERNANCE_ACTIVATED',
    rollback_event: 'CHAT_GOVERNANCE_ROLLBACK_READY',
    readiness_step: 3
  },
  boundary: {
    env_flag: 'IMPETUS_COGNITIVE_BOUNDARY_GUARD',
    activation_event: 'BOUNDARY_GUARD_ACTIVATED',
    rollback_event: 'BOUNDARY_GUARD_ROLLBACK_READY',
    readiness_step: 4
  },
  explainability: {
    env_flag: 'IMPETUS_GOVERNANCE_EXPLAINABILITY',
    activation_event: 'EXPLAINABILITY_ACTIVATED',
    readiness_step: 5
  },
  oversight: {
    env_flag: 'IMPETUS_GOVERNANCE_OVERSIGHT',
    activation_event: 'OVERSIGHT_ACTIVATED',
    readiness_step: 6
  },
  drift: {
    env_flag: 'IMPETUS_GOVERNANCE_DRIFT_DETECTION',
    activation_event: 'DRIFT_DETECTION_ACTIVATED',
    readiness_step: 7
  }
};

function getChannelDef(channel) {
  return CHANNELS[channel] || null;
}

function listChannels() {
  return Object.keys(CHANNELS);
}

module.exports = { CHANNELS, getChannelDef, listChannels };
