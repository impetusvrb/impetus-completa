'use strict';

const { buildExposureReason } = require('./exposureReasonBuilder');

/**
 * Explica decisão de precedência (Fase E policyPrecedenceResolver).
 */
function explainPolicyPrecedence(precedence = {}, ctx = {}) {
  const allowed = precedence.allowed !== false;
  const winning = precedence.winning_layer || (allowed ? 'rbac' : 'deny');
  const topDeny = Array.isArray(precedence.denies) && precedence.denies.length ? precedence.denies[0] : null;

  return buildExposureReason({
    decision: allowed ? 'allow' : 'deny',
    winning_layer: winning,
    reason: topDeny?.reason || topDeny?.scope || (allowed ? 'precedence_allow' : 'precedence_deny'),
    domain: ctx.domain,
    blocked_content: topDeny?.scope,
    policy_source: 'policyPrecedenceResolver',
    envelope_scope: ctx.envelope_scope,
    channel: ctx.channel,
    meta: {
      audit_trail: precedence.audit || [],
      deny_count: precedence.denies?.length || 0,
      allow_count: precedence.allows?.length || 0
    }
  });
}

/**
 * Explica bloqueio de KPI.
 */
function explainKpiDenial(deniedEntry = {}, ctx = {}) {
  return buildExposureReason({
    decision: 'deny',
    winning_layer: deniedEntry.reason?.includes('cross') ? 'domain_authority' : 'explicit_policy',
    reason: deniedEntry.reason || 'kpi_denied',
    domain: ctx.domain,
    blocked_content: deniedEntry.key,
    policy_source: 'secureKpiExposureResolver',
    envelope_scope: ctx.envelope_scope,
    channel: 'dashboard_kpis'
  });
}

/**
 * Explica sanitização de contexto.
 */
function explainSanitizerAction(stripped = {}, ctx = {}) {
  return buildExposureReason({
    decision: 'deny',
    winning_layer: 'deny',
    reason: 'context_sanitized',
    domain: ctx.domain,
    blocked_content: stripped.keys || 'raw_runtime_fields',
    policy_source: 'contextExposureSanitizer',
    envelope_scope: ctx.envelope_scope,
    channel: ctx.channel,
    meta: stripped
  });
}

module.exports = {
  explainPolicyPrecedence,
  explainKpiDenial,
  explainSanitizerAction
};
