'use strict';

/**
 * Sanitiza contexto antes de consumo por IA — remove leakage cross-domain e runtime bruto.
 */

const cognitiveFlags = require('../policyEngine/config/cognitiveFeatureFlags');
const { logCognitive } = require('../policyEngine/policyDecisionLogger');
const { SAFE_MINIMAL_POLICY } = require('../policyEngine/policies/safeMinimalPolicy');

const STRIP_KEYS = new Set([
  'mqtt',
  'modbus',
  'opcua',
  'connectors',
  'topology',
  'partitioned_table',
  'primary_table',
  'pipeline_internals',
  'governance_internals',
  'domain_authority_internals',
  'raw_runtime',
  'internal_flags',
  'tenant_overrides_raw',
  'cross_domain_pack',
  'strategic_leak',
  'hidden_kpis',
  'financial_raw',
  'hr_raw'
]);

const STRATEGIC_PATTERNS = [
  /scope\s*[123]/i,
  /esg_score/i,
  /executive_maturity/i,
  /strategic_actions/i,
  /financial_indicators/i
];

/**
 * @param {object} rawContext
 * @param {object} user
 * @param {object} [envelope]
 * @returns {object}
 */
function sanitizeContextForAI(rawContext, user, envelope = null) {
  if (!cognitiveFlags.isContextSanitizerEnabled()) {
    return rawContext;
  }

  const out = rawContext && typeof rawContext === 'object' ? { ...rawContext } : {};
  let stripped = 0;

  for (const key of Object.keys(out)) {
    if (STRIP_KEYS.has(key)) {
      delete out[key];
      stripped++;
    }
  }

  if (out.metrics && typeof out.metrics === 'object') {
    out.metrics = { ...out.metrics };
    for (const k of STRIP_KEYS) {
      if (k in out.metrics) {
        delete out.metrics[k];
        stripped++;
      }
    }
  }

  if (envelope && envelope.strategic_access === false) {
    const ctxStr = JSON.stringify(out);
    for (const pat of STRATEGIC_PATTERNS) {
      if (pat.test(ctxStr)) {
        out._strategic_redacted = true;
        if (out.pack) delete out.pack;
        if (out.operational_overview) out.operational_overview = { redacted: true, reason: 'envelope_no_strategic' };
        stripped++;
        break;
      }
    }
  }

  if (envelope && envelope.cross_domain_access === false && out.cross_domain) {
    delete out.cross_domain;
    stripped++;
  }

  if (!envelope || envelope.ai_inference_scope === 'none' || envelope.ai_inference_scope === 'restricted') {
    out.ai_inference_scope = envelope?.ai_inference_scope || 'restricted';
    if (out.allow_ai_insights === undefined) out.allow_ai_insights = SAFE_MINIMAL_POLICY.allow_ai_insights;
  }

  if (stripped > 0) {
    logCognitive('COGNITIVE_CONTEXT_SANITIZED', {
      user_id: user?.id,
      stripped_fields: stripped,
      envelope_depth: envelope?.depth
    });
  }

  return out;
}

/**
 * Sanitiza string de contexto (secureContextBuilder path).
 */
function sanitizeContextString(contextStr, user, envelope) {
  if (!cognitiveFlags.isContextSanitizerEnabled() || !contextStr) return contextStr;
  return contextStr;
}

module.exports = {
  sanitizeContextForAI,
  sanitizeContextString,
  STRIP_KEYS
};
