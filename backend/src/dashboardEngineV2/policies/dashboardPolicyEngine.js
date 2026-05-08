'use strict';

/**
 * DashboardPolicyEngine — runtime declarativo de políticas.
 *
 * Recebe a `ContextualIdentity` (já com capabilities derivadas pelo
 * `capabilitiesDeriver`) e o catálogo de políticas, e produz:
 *
 *   {
 *     identity_after_policies: { ...identity, capabilities, allowed_widgets, denied_widgets },
 *     audit_trail: [
 *       { policy_id, effect, applied: true|false, reason, lgpd? }
 *     ]
 *   }
 *
 * Princípios:
 *   - DENY-OVERRIDES — qualquer 'deny' que dispare ganha sobre 'allow'.
 *   - AUDITÁVEL — cada decisão é registada com policy_id e razão.
 *   - DECLARATIVO — sem hardcode em componentes; o catálogo é a fonte.
 *   - PURO — o engine não muta o input; devolve nova identity.
 */

const { POLICY_CATALOG } = require('./policyCatalog');

function _has(arr, v) {
  return Array.isArray(arr) && arr.includes(v);
}

function _matchApplyClause(applies, identity, user) {
  if (!applies) return true;
  const role = identity?.role_normalized || null;
  const fn = identity?.function_type || null;
  const area = identity?.area || null;
  const hl = Number(identity?.hierarchy_level);
  const scope = identity?.scope || null;
  const responsibilities = (user && Array.isArray(user.responsibilities)) ? user.responsibilities : [];

  if (applies.role_normalized != null && applies.role_normalized !== role) return false;
  if (applies.role_normalized_in && !_has(applies.role_normalized_in, role)) return false;

  if (applies.function_type != null && applies.function_type !== fn) return false;
  if (applies.function_type_not != null && applies.function_type_not === fn) return false;

  if (applies.area != null && applies.area !== area) return false;
  if (applies.area_in && !_has(applies.area_in, area)) return false;
  if (applies.area_not_in && _has(applies.area_not_in, area)) return false;

  if (applies.scope != null && applies.scope !== scope) return false;

  if (Number.isFinite(applies.hierarchy_level_max) && Number.isFinite(hl) && hl > applies.hierarchy_level_max) return false;
  if (Number.isFinite(applies.hierarchy_level_min) && Number.isFinite(hl) && hl < applies.hierarchy_level_min) return false;

  if (applies.responsibilities_includes && !_has(responsibilities, applies.responsibilities_includes)) return false;

  return true;
}

/**
 * Aplica políticas sobre uma identidade.
 *
 * @param {object} args
 * @param {object} args.identity  ContextualIdentity (do identityResolver)
 * @param {object} [args.user]    req.user para campos extra (responsibilities)
 * @param {Array} [args.policies] override do catálogo (apenas testes)
 * @returns {{ identity, audit_trail, allowed_widgets, denied_widgets }}
 */
function applyPolicies({ identity, user, policies } = {}) {
  if (!identity) {
    return { identity: null, audit_trail: [], allowed_widgets: [], denied_widgets: [] };
  }
  const list = Array.isArray(policies) && policies.length ? policies : POLICY_CATALOG;
  const audit = [];
  const baseCaps = new Set(Array.isArray(identity.capabilities) ? identity.capabilities : []);
  const augmented = new Set(baseCaps);
  const deniedCaps = new Set();
  const allowedWidgets = new Set();
  const deniedWidgets = new Set();

  for (const policy of list) {
    if (!policy || !policy.effect) continue;
    const matched = _matchApplyClause(policy.applies_to, identity, user);
    if (!matched) {
      audit.push({ policy_id: policy.id, effect: policy.effect, applied: false, reason: 'no_match' });
      continue;
    }

    if (policy.effect === 'augment_capabilities') {
      const added = [];
      for (const c of policy.capabilities || []) {
        if (!augmented.has(c)) { augmented.add(c); added.push(c); }
      }
      audit.push({
        policy_id: policy.id, effect: 'augment_capabilities', applied: true,
        reason: 'matched', capabilities_added: added,
        lgpd: policy.lgpd || null
      });
    } else if (policy.effect === 'allow') {
      const added = [];
      for (const w of policy.widgets || []) {
        if (!allowedWidgets.has(w)) { allowedWidgets.add(w); added.push(w); }
      }
      audit.push({
        policy_id: policy.id, effect: 'allow', applied: true,
        reason: 'matched', widgets_allowed: added
      });
    } else if (policy.effect === 'deny') {
      const widgets = (policy.widgets || []).slice();
      const caps = (policy.capabilities || []).slice();
      for (const w of widgets) deniedWidgets.add(w);
      for (const c of caps) {
        deniedCaps.add(c);
        augmented.delete(c);
      }
      audit.push({
        policy_id: policy.id, effect: 'deny', applied: true,
        reason: 'matched',
        widgets_denied: widgets,
        capabilities_denied: caps,
        lgpd: policy.lgpd || null
      });
    }
  }

  // Identidade pós-políticas (cópia rasa para preservar imutabilidade do input)
  const newIdentity = {
    ...identity,
    capabilities: Array.from(augmented).sort(),
    capabilities_denied: Array.from(deniedCaps).sort(),
    policy_audit: audit,
    policy_allowed_widgets: Array.from(allowedWidgets),
    policy_denied_widgets: Array.from(deniedWidgets)
  };

  return {
    identity: newIdentity,
    audit_trail: audit,
    allowed_widgets: Array.from(allowedWidgets),
    denied_widgets: Array.from(deniedWidgets)
  };
}

/**
 * Verifica se um widget pode ser renderizado segundo as políticas.
 * Combina: deny absoluto > allow explícito > capabilities suficientes.
 */
function isWidgetAllowed(widgetId, policiesResult, identity) {
  if (!widgetId) return false;
  if (!policiesResult) return true;
  if (policiesResult.denied_widgets.includes(widgetId)) return false;
  // se há um allow explícito, prevalece
  if (policiesResult.allowed_widgets.includes(widgetId)) return true;
  // sem regra explícita: deixar a granularityPolicy/capabilities decidir
  return true;
}

module.exports = {
  applyPolicies,
  isWidgetAllowed,
  POLICY_CATALOG
};
