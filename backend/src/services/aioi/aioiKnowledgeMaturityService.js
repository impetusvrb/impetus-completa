'use strict';

/**
 * AIOI-P7.5 — Knowledge Maturity Service
 *
 * Indicadores de maturidade do conhecimento operacional — READ ONLY.
 * Spec: backend/docs/AIOI_KNOWLEDGE_MATURITY_SPECIFICATION.md
 */

const knowledgeCatalog = require('./aioiKnowledgeCatalogService');
const operationalPatterns = require('./aioiOperationalPatternService');
const operationalKnowledge = require('./aioiOperationalKnowledgeService');
const certificationDrift = require('./aioiCertificationDriftService');

const LAYER = 'AIOI_KNOWLEDGE_MATURITY';

const CATALOG_DOMAINS = 7;

function _computeMaturityScore({ coverage, completeness, consistency, quality }) {
  const score = (coverage * 0.25) + (completeness * 0.25)
    + (consistency * 0.25) + (quality * 0.25);
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Avalia maturidade do conhecimento operacional enterprise.
 * @returns {Promise<object>}
 */
async function getKnowledgeMaturity() {
  const [catalog, patterns, knowledge, certDrift] = await Promise.all([
    knowledgeCatalog.getKnowledgeCatalog(),
    operationalPatterns.getOperationalPatterns(),
    operationalKnowledge.consolidateOperationalKnowledge(),
    Promise.resolve(certificationDrift.detectCertificationDrift())
  ]);

  const domainsWithData = [
    catalog.workflow_knowledge.recurring_events.length > 0 || catalog.workflow_knowledge.audit_events >= 0,
    catalog.execution_knowledge.session_counters != null,
    catalog.learning_knowledge.outcome_catalog.length >= 0,
    catalog.sla_knowledge.patterns.length >= 0,
    catalog.risk_knowledge.recurring_risks.length >= 0,
    catalog.tenant_knowledge.tenants.length >= 0,
    catalog.compliance_knowledge.overall_score >= 0
  ].filter(Boolean).length;

  const knowledgeCoverage = Math.round((domainsWithData / CATALOG_DOMAINS) * 10000) / 100;

  const catalogEntries = catalog.catalog_entry_count;
  const maxExpected = 20;
  const knowledgeCompleteness = Math.min(100, Math.round((catalogEntries / maxExpected) * 10000) / 100);

  const hasEvents = knowledge.recurring_events.length > 0;
  const hasOutcomes = knowledge.outcome_catalog.length > 0;
  const hasSla = knowledge.sla_patterns.length > 0;
  const consistencyFactors = [hasEvents, hasOutcomes, hasSla, !certDrift.certification_drift_detected];
  const knowledgeConsistency = Math.round(
    (consistencyFactors.filter(Boolean).length / consistencyFactors.length) * 10000
  ) / 100;

  const patternCount = patterns.pattern_summary.event_patterns
    + patterns.pattern_summary.outcome_patterns
    + patterns.pattern_summary.sla_patterns;
  const knowledgeQuality = Math.min(100, Math.round((patternCount / 10) * 100));

  const maturityScore = _computeMaturityScore({
    coverage:     knowledgeCoverage,
    completeness: knowledgeCompleteness,
    consistency:  knowledgeConsistency,
    quality:      knowledgeQuality
  });

  return {
    ok: true,
    layer: LAYER,
    knowledge_coverage:     knowledgeCoverage,
    knowledge_completeness: knowledgeCompleteness,
    knowledge_consistency:  knowledgeConsistency,
    knowledge_quality:      knowledgeQuality,
    knowledge_maturity_score: maturityScore,
    maturity_level: maturityScore >= 80 ? 'ADVANCED'
      : maturityScore >= 60 ? 'ESTABLISHED'
        : maturityScore >= 40 ? 'DEVELOPING'
          : 'INITIAL',
    catalog_entry_count: catalogEntries,
    pattern_count:       patternCount,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getKnowledgeMaturity,
  LAYER
};
