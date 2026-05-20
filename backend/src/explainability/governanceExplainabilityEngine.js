'use strict';

const phaseG = require('./config/phaseGFeatureFlags');
const { buildTraceRecord } = require('./cognitiveDecisionTraceBuilder');
const { explainPolicyPrecedence, explainKpiDenial, explainSanitizerAction } = require('./policyDecisionExplainer');
const { buildExposureReason } = require('./exposureReasonBuilder');

let traceService = null;
function getTraceService() {
  if (!traceService) {
    try {
      traceService = require('../governanceTrace/governanceTraceService');
    } catch {
      traceService = null;
    }
  }
  return traceService;
}

/**
 * Explica e opcionalmente persiste decisão de governança.
 */
function explainGovernanceDecision(input = {}) {
  if (!phaseG.isGovernanceExplainabilityEnabled() && !input.force) {
    return { enabled: false, explanation: null };
  }

  let explanation;
  if (input.type === 'kpi_denial') {
    explanation = explainKpiDenial(input.denied_entry || {}, input);
  } else if (input.type === 'sanitizer') {
    explanation = explainSanitizerAction(input.stripped || {}, input);
  } else if (input.precedence) {
    explanation = explainPolicyPrecedence(input.precedence, input);
  } else {
    explanation = buildExposureReason(input);
  }

  const trace = buildTraceRecord({
    ...input,
    explanation,
    decision: explanation.decision,
    policy_layer: explanation.winning_layer,
    reason: explanation.reason,
    blocked_content: explanation.blocked_content
  });

  if (phaseG.isGovernanceTraceEnabled() || input.persist) {
    const svc = getTraceService();
    if (svc) svc.recordTrace(trace);
  }

  return { enabled: true, explanation, trace };
}

function explainByTraceId(traceId) {
  const svc = getTraceService();
  if (!svc) return null;
  return svc.getTrace(traceId);
}

module.exports = {
  explainGovernanceDecision,
  explainByTraceId,
  phaseG
};
