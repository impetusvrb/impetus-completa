'use strict';

const { resolveKpiSemanticCorrections } = require('./kpiSemanticCorrectionResolver');
const { analyzeOperationalKpiRelevance } = require('./operationalKpiRelevanceAnalyzer');
const { validateContextualKpiSemantics } = require('./contextualKpiSemanticValidator');
const { inferHierarchyBand } = require('../kpiRollout/hierarchyKpiValidator');

function alignKpiSemantics(user, kpiPayload, ctx = {}) {
  const semantic = validateContextualKpiSemantics(user, kpiPayload, ctx);
  const relevance = analyzeOperationalKpiRelevance(user, kpiPayload, ctx);
  const corrections = resolveKpiSemanticCorrections(user, kpiPayload, ctx);
  const band = inferHierarchyBand(user, ctx);

  const coherence =
    semantic.contextual_alignment_score * 0.5 + relevance.KPI_operational_usefulness * 0.5;

  return {
    KPI_semantic_relevance: relevance.KPI_semantic_relevance,
    KPI_operational_usefulness: relevance.KPI_operational_usefulness,
    KPI_hierarchy_coherence: Number(coherence.toFixed(4)),
    KPI_contextual_alignment: semantic.contextual_alignment_score,
    hierarchy_band: band,
    corrections: corrections.resolutions,
    recommendations: relevance.recommendations,
    auto_correct: false
  };
}

module.exports = { alignKpiSemantics };
