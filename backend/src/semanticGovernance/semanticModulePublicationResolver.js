'use strict';

/**
 * Precedência: DENY → DOMAIN AUTHORITY → SEMANTIC AUTHORITY → ENVELOPE → SHARED → UX
 * Shadow-first: observa sem remover módulos por defeito.
 */

const phaseK = require('./config/phaseKFeatureFlags');
const { logPhaseK } = require('./phaseKLogger');
const { composeMenu } = require('./semanticMenuCompositionEngine');
const { recordPublicationAudit } = require('./semanticPublicationAudit');

function resolveSemanticPublication(user, ctx = {}) {
  const modules = Array.isArray(ctx.visible_modules) ? [...ctx.visible_modules] : [];
  const enforcement = phaseK.isSemanticPublicationGovernanceEnabled();
  const observe = phaseK.isSemanticRuntimeObservabilityEnabled() || ctx.force_observe;

  const semanticCtx = {
    user_id: user?.id,
    functional_axis: ctx.functional_axis || user?.functional_axis || ctx.functional_area,
    functional_area: ctx.functional_area || user?.functional_area,
    domain: ctx.domain,
    shadow_only: !enforcement,
    executive_override: ctx.executive_override === true
  };

  let denied = [];
  try {
    const { SAFE_MINIMAL_EXPOSURE } = require('../policyEngine/policies/safeMinimalPolicy');
    if (ctx.failsafe || process.env.IMPETUS_FAILSAFE_GOVERNANCE === 'on') {
      denied = Object.entries(SAFE_MINIMAL_EXPOSURE.sections || {})
        .filter(([, v]) => v === false)
        .map(([k]) => k);
    }
  } catch {
    /* optional */
  }

  const composed = composeMenu(modules, semanticCtx);

  let envelopeModules = modules;
  if (ctx.cognitive_envelope?.visible_modules) {
    envelopeModules = ctx.cognitive_envelope.visible_modules;
  } else if (ctx.content_exposure?.visible_modules) {
    envelopeModules = ctx.content_exposure.visible_modules;
  }

  const alignedModules = enforcement ? composed.visible_modules : modules;

  const wouldBlock = modules.filter((m) => !composed.visible_modules.includes(m));
  if (wouldBlock.length && observe) {
    logPhaseK('PUBLICATION_LEAKAGE_DETECTED', {
      count: wouldBlock.length,
      modules: wouldBlock.slice(0, 10),
      axis: semanticCtx.functional_axis,
      shadow_only: !enforcement
    });
  }

  const result = {
    visible_modules: enforcement ? alignedModules : modules,
    aligned_modules: composed.visible_modules,
    blocked: composed.blocked,
    leakage: composed.leakage,
    denied_sections: denied,
    semantic_integrity_score: modules.length
      ? Number((composed.visible_modules.length / Math.max(modules.length, 1)).toFixed(4))
      : 1,
    enforcement_active: enforcement,
    shadow_only: !enforcement,
    auto_removed: false
  };

  if (observe) {
    recordPublicationAudit({
      user_id: user?.id,
      axis: semanticCtx.functional_axis,
      input_count: modules.length,
      aligned_count: composed.visible_modules.length,
      blocked_count: composed.blocked.length,
      enforcement
    });
  }

  return result;
}

module.exports = { resolveSemanticPublication };
