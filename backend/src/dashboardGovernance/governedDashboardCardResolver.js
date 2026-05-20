'use strict';

const phaseK = require('../semanticGovernance/config/phaseKFeatureFlags');
const { isModuleAllowedForContext } = require('../semanticGovernance/governedSharedModules');

const CARD_SCOPES = {
  kpi: { semantic_scope: 'metrics', governance_scope: 'kpi_channel', domains: ['*'] },
  summary: { semantic_scope: 'narrative', governance_scope: 'summary_channel', domains: ['*'] },
  chart: { semantic_scope: 'visualization', governance_scope: 'widget', domains: ['quality', 'safety', 'executive'] },
  module: { semantic_scope: 'navigation', governance_scope: 'publication', domains: ['*'] },
  executive: { semantic_scope: 'executive', governance_scope: 'executive_only', domains: ['executive'] }
};

function resolveCard(card, ctx = {}) {
  const enforcement = phaseK.isGovernedCardOrchestrationEnabled();
  const type = card?.type || card?.widget_type || 'module';
  const scope = CARD_SCOPES[type] || CARD_SCOPES.module;

  const domainOk = !scope.domains[0] || scope.domains[0] === '*' ||
    scope.domains.includes(ctx.functional_axis) ||
    scope.domains.includes(ctx.domain);

  const modCheck = card?.module_id ?
    isModuleAllowedForContext(card.module_id, ctx) :
    { allowed: true };

  const aligned = domainOk && modCheck.allowed;
  const shadowOnly = !enforcement;

  return {
    card,
    aligned,
    shadow_only: shadowOnly,
    visible: shadowOnly ? true : aligned,
    semantic_scope: scope.semantic_scope,
    governance_scope: scope.governance_scope,
    auto_hidden: false,
    reason: aligned ? 'aligned' : modCheck.reason || 'domain_mismatch'
  };
}

module.exports = { resolveCard, CARD_SCOPES };
