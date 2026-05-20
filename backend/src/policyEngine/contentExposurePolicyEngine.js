'use strict';

/**
 * Content Exposure Policy Engine — orquestra camadas sem remover legado.
 */

const cognitiveFlags = require('./config/cognitiveFeatureFlags');
const { SAFE_MINIMAL_EXPOSURE } = require('./policies/safeMinimalPolicy');
const { resolvePrecedence, filterByDenyList } = require('./policyPrecedenceResolver');
const { resolveCognitiveEnvelope } = require('./cognitiveEnvelopeResolver');
const { logCognitive } = require('./policyDecisionLogger');

const dashboardAccessService = require('../services/dashboardAccessService');
const dashboardVisibility = require('../services/dashboardVisibility');

let domainAuthorityResolver = null;
try {
  domainAuthorityResolver = require('../domainAuthority/resolvers/domainAuthorityResolver');
} catch {
  domainAuthorityResolver = null;
}

/**
 * Constrói decisões de camada a partir do utilizador (additive).
 */
async function buildLayerDecisions(user, ctx = {}) {
  const decisions = [];
  const deniedModules = new Set(ctx.denied_modules || []);

  if (ctx.domain_authority?.blocked_modules) {
    for (const m of ctx.domain_authority.blocked_modules) {
      deniedModules.add(m);
      decisions.push({
        layer: 'domain_authority',
        effect: 'deny',
        scope: m,
        reason: 'domain_isolation'
      });
    }
  }

  if (ctx.explicit_denies) {
    for (const d of ctx.explicit_denies) {
      deniedModules.add(d);
      decisions.push({ layer: 'deny', effect: 'deny', scope: d, reason: 'explicit_deny' });
    }
  }

  const allowedModules = dashboardAccessService.getAllowedModules(user);
  for (const m of allowedModules) {
    if (!deniedModules.has(m)) {
      decisions.push({ layer: 'rbac', effect: 'allow', scope: m, reason: 'rbac_module' });
    }
  }

  const hl = user?.hierarchy_level ?? 5;
  let sections = ctx.sections;
  if (!sections && user?.company_id) {
    try {
      sections = await dashboardVisibility.getVisibilityForUser(hl, user.company_id);
    } catch {
      sections = SAFE_MINIMAL_EXPOSURE.sections;
    }
  }

  if (sections) {
    for (const [key, val] of Object.entries(sections)) {
      if (val === false) {
        decisions.push({
          layer: 'explicit_policy',
          effect: 'deny',
          scope: `section:${key}`,
          reason: 'dashboard_visibility'
        });
      }
    }
  }

  return { decisions, deniedModules, allowedModules, sections: sections || {} };
}

/**
 * Avalia exposição com precedência deny-first.
 */
async function evaluateContentExposure(user, ctx = {}) {
  if (!cognitiveFlags.isCognitivePolicyEngineEnabled()) {
    return { enabled: false, legacy_only: true };
  }

  try {
    const { decisions, deniedModules, allowedModules, sections } = await buildLayerDecisions(user, ctx);
    const visibleModules = filterByDenyList(allowedModules, deniedModules, { user_id: user?.id });

    const precedence = resolvePrecedence(decisions);
    const envelope = resolveCognitiveEnvelope(user, {
      dashboardConfig: ctx.dashboard_config,
      force: cognitiveFlags.isCognitiveEnvelopeEnabled()
    });

    const exposure = {
      visible_modules: visibleModules.length ? visibleModules : ['dashboard'],
      denied_modules: [...deniedModules],
      sections,
      allow_widgets: sections.trend_chart !== false && precedence.allowed,
      allow_kpis: sections.kpi_request !== false && precedence.allowed,
      allow_ai_insights: sections.ai_insights !== false && precedence.allowed,
      allow_operational_context: sections.operational_interactions !== false,
      allow_cross_domain: envelope?.cross_domain_access === true,
      cognitive_envelope: envelope,
      policy_precedence: precedence,
      policy_source: 'content_exposure_policy_engine',
      failsafe: false
    };

    logCognitive('COGNITIVE_POLICY_APPLIED', {
      user_id: user?.id,
      module_count: exposure.visible_modules.length,
      denied_count: exposure.denied_modules.length,
      winning_layer: precedence.winning_layer
    });

    return { enabled: true, exposure };
  } catch (err) {
    if (cognitiveFlags.isFailsafeGovernanceEnabled()) {
      logCognitive('COGNITIVE_FAILSAFE_TRIGGERED', {
        user_id: user?.id,
        error: err?.message || 'evaluate_failed'
      });
      return { enabled: true, exposure: { ...SAFE_MINIMAL_EXPOSURE }, failsafe: true };
    }
    throw err;
  }
}

module.exports = {
  evaluateContentExposure,
  buildLayerDecisions
};
