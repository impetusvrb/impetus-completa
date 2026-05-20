'use strict';

const { logPhaseK } = require('../semanticGovernance/phaseKLogger');
const phaseK = require('../semanticGovernance/config/phaseKFeatureFlags');

const BUILDERS = [
  { id: 'secure_chat', path: 'policyEngine/channels/secureChatContextBuilder', governed: true },
  { id: 'legacy_chat', path: 'routes/dashboard.js', method: 'governChatRequest', governed: true },
  { id: 'contextual_modules', path: 'contextualModules', governed: false },
  { id: 'user_context', path: 'services/userContext', governed: false }
];

function detectOrphanContextBuilders(ctx = {}) {
  if (!phaseK.isOrphanPipelineDetectionEnabled() && !ctx.force) {
    return { enabled: false, builders: [] };
  }

  const orphans = BUILDERS.filter((b) => !b.governed);
  for (const o of orphans) {
    logPhaseK('ORPHAN_PIPELINE_DETECTED', { type: 'context_builder', id: o.id });
  }

  return { enabled: true, builders: BUILDERS, orphans };
}

module.exports = { detectOrphanContextBuilders, BUILDERS };
