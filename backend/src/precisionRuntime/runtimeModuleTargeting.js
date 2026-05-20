'use strict';

const { isModuleAllowedForContext } = require('../semanticGovernance/governedSharedModules');

function buildTargetingContext(user, ctx = {}) {
  return {
    user_id: user?.id,
    tenant_id: user?.company_id,
    functional_axis: ctx.functional_axis || user?.functional_axis || user?.functional_area,
    functional_area: ctx.functional_area || user?.functional_area,
    hierarchy_level: user?.hierarchy_level ?? ctx.hierarchy_level ?? 5,
    is_internal_admin: user?.is_internal_admin === true,
    domain: ctx.domain || user?.domain
  };
}

function scoreModuleTarget(moduleId, targetingCtx) {
  const check = isModuleAllowedForContext(moduleId, targetingCtx);
  let confidence = check.allowed ? 0.92 : 0.15;
  const def = require('../semanticGovernance/governedSharedModules').getModuleClassification(moduleId);
  if (def.unknown) confidence *= 0.7;
  if (def.classification === 'exclusive' && check.allowed) confidence = 0.98;
  return {
    module_id: moduleId,
    eligible: check.allowed,
    module_delivery_confidence: Number(confidence.toFixed(4)),
    reason: check.reason,
    classification: def.classification
  };
}

module.exports = { buildTargetingContext, scoreModuleTarget };
