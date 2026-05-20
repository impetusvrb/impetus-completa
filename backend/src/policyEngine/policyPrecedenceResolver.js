'use strict';

/**
 * Precedência formal (deny-first):
 * DENY → DOMAIN AUTHORITY → RBAC → EXPLICIT POLICY → IA CONTEXTUAL → UX
 */

const { logCognitive } = require('./policyDecisionLogger');

const LAYER_ORDER = ['deny', 'domain_authority', 'rbac', 'explicit_policy', 'ia_contextual', 'ux'];

/**
 * @param {Array<{ layer: string, effect: 'allow'|'deny', scope?: string, reason?: string, meta?: object }>} decisions
 * @returns {{ allowed: boolean, winning_layer: string|null, denies: object[], allows: object[], audit: object[] }}
 */
function resolvePrecedence(decisions = []) {
  const audit = [];
  const denies = [];
  const allows = [];

  for (const d of decisions) {
    if (!d || !d.layer || !d.effect) continue;
    audit.push({ layer: d.layer, effect: d.effect, scope: d.scope, reason: d.reason });
    if (d.effect === 'deny') denies.push(d);
    else if (d.effect === 'allow') allows.push(d);
  }

  if (denies.length > 0) {
    const topDeny = denies.sort(
      (a, b) => LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer)
    )[0];
    logCognitive('COGNITIVE_POLICY_DENIED', {
      layer: topDeny.layer,
      scope: topDeny.scope,
      reason: topDeny.reason
    });
    return { allowed: false, winning_layer: topDeny.layer, denies, allows, audit };
  }

  const topAllow =
    allows.sort((a, b) => LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer)).pop() || null;

  return {
    allowed: true,
    winning_layer: topAllow ? topAllow.layer : 'default',
    denies,
    allows,
    audit
  };
}

/**
 * Aplica deny sobre lista de módulos/recursos.
 */
function filterByDenyList(items, deniedSet, ctx = {}) {
  if (!Array.isArray(items)) return [];
  const denied = deniedSet instanceof Set ? deniedSet : new Set(deniedSet || []);
  const out = [];
  for (const item of items) {
    const key = typeof item === 'string' ? item : item?.id || item?.key;
    if (!key) continue;
    if (denied.has(key)) {
      logCognitive('COGNITIVE_SCOPE_BLOCKED', { scope: key, ...ctx });
      continue;
    }
    out.push(item);
  }
  return out;
}

module.exports = {
  LAYER_ORDER,
  resolvePrecedence,
  filterByDenyList
};
