'use strict';

const phaseK = require('../semanticGovernance/config/phaseKFeatureFlags');
const { resolveSemanticPublication } = require('../semanticGovernance/semanticModulePublicationResolver');
const { listPublicationAudit } = require('../semanticGovernance/semanticPublicationAudit');
const { detectOrphanPipelines } = require('./orphanPipelineDetector');
const { detectOrphanContextBuilders } = require('./orphanContextBuilderDetector');
const { detectOrphanEnrichers } = require('./orphanEnricherDetector');
const { detectDuplicatedPipelines } = require('./duplicatedPipelineDetector');
const { getContextDependencyMap } = require('./runtimeContextDependencyMap');
const { composeCards } = require('../dashboardGovernance/contextualCardCompositionEngine');
const { getSemanticTelemetry } = require('./semanticRuntimeTelemetry');
const { alignKpiResponse } = require('./governedKpiAlignment');
const { alignSummaryResponse } = require('./governedSummaryAlignment');

function isAlignmentLayerActive() {
  return (
    phaseK.isSemanticRuntimeObservabilityEnabled() ||
    phaseK.isSemanticPublicationGovernanceEnabled() ||
    phaseK.isRuntimeAlignmentAuditEnabled()
  );
}

function enrichDashboardMe(user, legacyResponse, ctx = {}) {
  if (!isAlignmentLayerActive() && !ctx.force) {
    return { response: legacyResponse, alignment: null };
  }

  const publication = resolveSemanticPublication(user, {
    visible_modules: legacyResponse.visible_modules,
    functional_axis: legacyResponse.functional_axis || legacyResponse.functional_area,
    cognitive_envelope: ctx.cognitive_envelope,
    content_exposure: ctx.content_exposure
  });

  if (publication.leakage?.length) {
    try {
      const { recordLeakage } = require('./semanticRuntimeTelemetry');
      recordLeakage(publication.leakage.length);
    } catch {
      /* optional */
    }
  }

  let widgets = legacyResponse.engine_v2?.payload?.layout?.widgets;
  let cardBlock = null;
  if (widgets) {
    cardBlock = composeCards(widgets, {
      functional_axis: legacyResponse.functional_axis,
      domain: legacyResponse.functional_area
    });
  }

  const kpiAlign = alignKpiResponse(legacyResponse.kpis, {
    functional_axis: legacyResponse.functional_axis
  });

  const out = { ...legacyResponse };
  if (publication.enforcement_active) {
    out.visible_modules = publication.visible_modules;
  }

  return {
    response: out,
    alignment: {
      publication,
      cards: cardBlock,
      kpis: kpiAlign,
      telemetry: getSemanticTelemetry()
    }
  };
}

function getAlignmentReport(ctx = {}) {
  return {
    enabled: isAlignmentLayerActive() || ctx.force,
    flags: {
      semantic_publication: phaseK.isSemanticPublicationGovernanceEnabled(),
      runtime_audit: phaseK.isRuntimeAlignmentAuditEnabled(),
      orphan_detection: phaseK.isOrphanPipelineDetectionEnabled(),
      card_orchestration: phaseK.isGovernedCardOrchestrationEnabled(),
      fallback_sanitization: phaseK.isContextualFallbackSanitizationEnabled(),
      observability: phaseK.isSemanticRuntimeObservabilityEnabled()
    },
    publication_audit: listPublicationAudit(50),
    orphans: detectOrphanPipelines({ force: ctx.force }),
    context_builders: detectOrphanContextBuilders({ force: ctx.force }),
    enrichers: detectOrphanEnrichers({ force: ctx.force }),
    duplicates: detectDuplicatedPipelines({ force: ctx.force }),
    dependencies: getContextDependencyMap(ctx),
    telemetry: getSemanticTelemetry(),
    enforcement_default: false,
    shadow_first: true
  };
}

module.exports = {
  isAlignmentLayerActive,
  enrichDashboardMe,
  getAlignmentReport,
  resolveSemanticPublication,
  alignKpiResponse,
  alignSummaryResponse
};
