'use strict';

const { normalizeModuleId } = require('./moduleAliasRegistry');

const AUTHORITY_SCOPES = Object.freeze({
  strategic: { max_operational_depth: 0, deny: ['manuia', 'anomaly_detection', 'safety_intelligence'] },
  tactical: { max_operational_depth: 2, deny: ['admin'] },
  floor: { max_operational_depth: 5, deny: ['audit', 'admin', 'esg'] }
});

function resolveAuthorityScope(hierarchyTier, authorityScope) {
  if (authorityScope && AUTHORITY_SCOPES[authorityScope]) return AUTHORITY_SCOPES[authorityScope];
  if (hierarchyTier === 'executive') return AUTHORITY_SCOPES.strategic;
  if (hierarchyTier === 'operational') return AUTHORITY_SCOPES.floor;
  return AUTHORITY_SCOPES.tactical;
}

function isModuleDeniedByAuthority(moduleId, ctx = {}) {
  const scope = resolveAuthorityScope(ctx.hierarchy_tier, ctx.authority_scope);
  const key = normalizeModuleId(moduleId);
  if (scope.deny?.includes(key)) {
    return { denied: true, reason: 'authority_denied', scope: ctx.authority_scope || ctx.hierarchy_tier };
  }
  return { denied: false };
}

module.exports = { AUTHORITY_SCOPES, resolveAuthorityScope, isModuleDeniedByAuthority };
