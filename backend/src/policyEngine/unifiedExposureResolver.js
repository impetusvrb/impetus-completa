'use strict';

/**
 * resolveContentExposure — fonte unificada (additive; legado preservado quando flag off).
 */

const cognitiveFlags = require('./config/cognitiveFeatureFlags');
const { SAFE_MINIMAL_EXPOSURE } = require('./policies/safeMinimalPolicy');
const { logCognitive } = require('./policyDecisionLogger');
const contentExposurePolicyEngine = require('./contentExposurePolicyEngine');
const { resolveCognitiveEnvelope } = require('./cognitiveEnvelopeResolver');

const dashboardProfileResolver = require('../services/dashboardProfileResolver');
const dashboardAccessService = require('../services/dashboardAccessService');
const dashboardVisibility = require('../services/dashboardVisibility');

let domainAuthority = null;
try {
  domainAuthority = require('../domainAuthority');
} catch {
  domainAuthority = null;
}

/**
 * @param {object} user
 * @param {object} [opts] — { sections?, kpis?, engine_v2? }
 * @returns {Promise<object>}
 */
async function resolveContentExposure(user, opts = {}) {
  const dashboardConfig = dashboardProfileResolver.getDashboardConfigForUser(user);
  const hl = user?.hierarchy_level ?? 5;

  let sections = opts.sections;
  if (!sections && user?.company_id) {
    try {
      sections = await dashboardVisibility.getVisibilityForUser(hl, user.company_id);
    } catch (err) {
      if (cognitiveFlags.isFailsafeGovernanceEnabled()) {
        logCognitive('COGNITIVE_FAILSAFE_TRIGGERED', {
          user_id: user?.id,
          phase: 'visibility_load',
          error: err?.message
        });
        sections = { ...SAFE_MINIMAL_EXPOSURE.sections };
      } else {
        sections = {};
      }
    }
  }

  const domainBlock =
    dashboardConfig.domain_authority ||
    (domainAuthority && domainAuthority.isDomainAuthorityEnabled() ?
      domainAuthority.resolveDomainAuthority(user, dashboardConfig) :
      null);

  const legacy = {
    profile_code: dashboardConfig.profile_code,
    functional_axis: dashboardConfig.functional_axis || dashboardConfig.functional_area,
    visible_modules:
      opts.visible_modules ||
      dashboardAccessService.getAllowedModules(user) ||
      dashboardConfig.profile_config?.visible_modules ||
      ['dashboard'],
    sections: sections || {},
    kpis: opts.kpis || [],
    ia_data_depth: dashboardAccessService.getIADataDepth(user),
    widgets: opts.widgets || opts.engine_v2?.allowed_widgets || [],
    contextual_modules_hint: dashboardConfig.contextual_modules_hint || [],
    domain_authority: domainBlock
  };

  if (!cognitiveFlags.isCognitivePolicyEngineEnabled()) {
    return {
      version: 'legacy',
      policy_engine_enabled: false,
      ...legacy,
      cognitive_envelope: resolveCognitiveEnvelope(user, {
        dashboardConfig,
        force: cognitiveFlags.isCognitiveEnvelopeEnabled()
      })
    };
  }

  const evaluated = await contentExposurePolicyEngine.evaluateContentExposure(user, {
    sections: legacy.sections,
    dashboard_config: dashboardConfig,
    domain_authority: domainBlock,
    explicit_denies: opts.explicit_denies
  });

  if (evaluated.failsafe || evaluated.exposure?.failsafe) {
    return {
      version: 'failsafe',
      policy_engine_enabled: true,
      ...legacy,
      visible_modules: SAFE_MINIMAL_EXPOSURE.visible_modules,
      sections: SAFE_MINIMAL_EXPOSURE.sections,
      content_exposure: evaluated.exposure || SAFE_MINIMAL_EXPOSURE,
      failsafe: true
    };
  }

  const exp = evaluated.exposure || {};
  return {
    version: 'unified_v1',
    policy_engine_enabled: true,
    ...legacy,
    visible_modules: exp.visible_modules || legacy.visible_modules,
    sections: exp.sections || legacy.sections,
    denied_modules: exp.denied_modules || [],
    allow_widgets: exp.allow_widgets,
    allow_kpis: exp.allow_kpis,
    allow_ai_insights: exp.allow_ai_insights,
    allow_operational_context: exp.allow_operational_context,
    allow_cross_domain: exp.allow_cross_domain,
    cognitive_envelope: exp.cognitive_envelope,
    content_exposure: exp,
    policy_precedence: exp.policy_precedence
  };
}

module.exports = {
  resolveContentExposure
};
