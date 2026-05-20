'use strict';

const phaseK = require('../semanticGovernance/config/phaseKFeatureFlags');
const { logPhaseK } = require('../semanticGovernance/phaseKLogger');

const KNOWN_GOVERNED = [
  'policyEngine/cognitiveGovernanceFacade',
  'policyEngine/unifiedExposureResolver',
  'policyEngine/channels/secureChatContextBuilder',
  'policyEngine/channels/secureKpiExposureResolver',
  'policyEngine/channels/summaryExposureSanitizer',
  'semanticGovernance/semanticModulePublicationResolver'
];

function detectOrphanPipelines(ctx = {}) {
  if (!phaseK.isOrphanPipelineDetectionEnabled() && !ctx.force) {
    return { enabled: false, orphans: [] };
  }

  let scan = { ungoverned: [], legacy: [] };
  try {
    scan = require('../governanceBootstrap/cognitiveRouteScanner').scanCognitiveRoutes();
  } catch {
    scan = { ungoverned: [], legacy: [] };
  }

  const orphans = [...scan.ungoverned, ...scan.legacy].map((f) => ({
    pipeline: f.file,
    classification: f.classification,
    has_governance_hook: f.has_governance_hook
  }));

  for (const o of orphans) {
    logPhaseK('ORPHAN_PIPELINE_DETECTED', { pipeline: o.pipeline, classification: o.classification });
  }

  return {
    enabled: true,
    orphan_count: orphans.length,
    orphans: orphans.slice(0, 100),
    known_governed: KNOWN_GOVERNED
  };
}

module.exports = { detectOrphanPipelines, KNOWN_GOVERNED };
