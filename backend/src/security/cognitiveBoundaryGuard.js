'use strict';

/**
 * Cognitive Context Boundary — impede bypass de governança em pipelines IA.
 */

const phaseF = require('../policyEngine/config/phaseFFeatureFlags');
const { logPhaseF } = require('../policyEngine/observability/phaseFLogger');
const telemetry = require('../policyEngine/observability/governanceTelemetry');
const contextExposureSanitizer = require('./contextExposureSanitizer');

const CHANNEL_RULES = {
  dashboard_chat: { requires_operational: true, allow_raw_pack: false },
  dashboard_kpis: { requires_kpi: true, allow_raw_pack: false },
  smart_summary: { requires_ai_insights: true, allow_raw_pack: false },
  live_dashboard: { requires_operational: true, allow_raw_pack: false },
  cognitive_council: { requires_operational: true, allow_raw_pack: false },
  data_retrieval: { requires_operational: true, allow_raw_pack: false }
};

/**
 * @param {string} channel
 * @param {object} user
 * @param {object} exposure
 */
function assertChannelBoundary(channel, user, exposure = {}) {
  if (!phaseF.isCognitiveBoundaryGuardEnabled(user)) {
    return { allowed: true, reason: 'guard_disabled' };
  }

  const rules = CHANNEL_RULES[channel] || CHANNEL_RULES.data_retrieval;
  const sections = exposure.sections || {};

  if (rules.requires_kpi && (sections.kpi_request === false || exposure.allow_kpis === false)) {
    logPhaseF('COGNITIVE_BOUNDARY_BLOCKED', { channel, user_id: user?.id, rule: 'kpi' });
    telemetry.recordDenial('boundary_kpi');
    return { allowed: false, reason: 'kpi_channel_denied' };
  }
  if (rules.requires_ai_insights && (sections.ai_insights === false || exposure.allow_ai_insights === false)) {
    logPhaseF('COGNITIVE_BOUNDARY_BLOCKED', { channel, user_id: user?.id, rule: 'ai_insights' });
    return { allowed: false, reason: 'ai_insights_denied' };
  }
  if (rules.requires_operational && exposure.allow_operational_context === false) {
    logPhaseF('COGNITIVE_BOUNDARY_BLOCKED', { channel, user_id: user?.id, rule: 'operational' });
    return { allowed: false, reason: 'operational_context_denied' };
  }

  return { allowed: true, reason: 'ok' };
}

/**
 * Sanitiza pack contextual antes de qualquer pipeline IA.
 */
function boundarySanitizePack(pack, user, exposure = {}, channel = 'data_retrieval') {
  const boundary = assertChannelBoundary(channel, user, exposure);
  if (!boundary.allowed) {
    return {
      kpis: [],
      events: [],
      assets: [],
      metrics: { data_state: 'governance_denied' },
      contextual_data: {},
      governance_denied: true,
      denial_reason: boundary.reason
    };
  }

  if (!pack || typeof pack !== 'object') return pack;

  let out = { ...pack };
  if (phaseF.isCognitiveBoundaryGuardEnabled(user) || phaseF.isChatGovernanceEnabled(user)) {
    out = contextExposureSanitizer.sanitizeContextForAI(out, user, exposure.cognitive_envelope);
  }

  if (exposure.denied_modules?.length) {
    const denied = new Set(exposure.denied_modules);
    if (out.contextual_data && typeof out.contextual_data === 'object') {
      for (const mod of denied) {
        if (out.contextual_data[mod]) delete out.contextual_data[mod];
      }
    }
  }

  if (exposure.cognitive_envelope?.cross_domain_access === false && out.cross_domain) {
    delete out.cross_domain;
    logPhaseF('CHAT_CROSS_DOMAIN_BLOCKED', { channel, user_id: user?.id });
    telemetry.recordDenial('cross_domain');
  }

  return out;
}

module.exports = {
  assertChannelBoundary,
  boundarySanitizePack,
  CHANNEL_RULES
};
