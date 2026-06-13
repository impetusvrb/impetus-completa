'use strict';

/**
 * AIOI-P7.4 — Enterprise Knowledge Report Service
 *
 * Relatório executivo de conhecimento operacional — READ ONLY.
 */

const operationalKnowledge = require('./aioiOperationalKnowledgeService');
const knowledgeCatalog = require('./aioiKnowledgeCatalogService');
const operationalPatterns = require('./aioiOperationalPatternService');
const knowledgeMaturity = require('./aioiKnowledgeMaturityService');
const governanceAssurance = require('./aioiGovernanceAssuranceService');

const LAYER = 'AIOI_ENTERPRISE_KNOWLEDGE_REPORT';

/**
 * Gera relatório executivo de conhecimento enterprise.
 * @returns {Promise<object>}
 */
async function generateEnterpriseKnowledgeReport() {
  const [knowledge, catalog, patterns, maturity, assurance] = await Promise.all([
    operationalKnowledge.consolidateOperationalKnowledge(),
    knowledgeCatalog.getKnowledgeCatalog(),
    operationalPatterns.getOperationalPatterns(),
    knowledgeMaturity.getKnowledgeMaturity(),
    governanceAssurance.validateContinuousGovernance()
  ]);

  let recommendation = 'MAINTAIN_KNOWLEDGE_MONITORING';
  if (maturity.knowledge_maturity_score >= 70 && maturity.knowledge_consistency >= 75) {
    recommendation = 'KNOWLEDGE_FOUNDATION_READY';
  } else if (maturity.knowledge_maturity_score >= 50) {
    recommendation = 'EXPAND_KNOWLEDGE_COVERAGE';
  } else {
    recommendation = 'ACCUMULATE_OPERATIONAL_EVIDENCE';
  }

  return {
    ok: true,
    layer: LAYER,
    knowledge_summary: {
      recurring_events:  knowledge.recurring_events.length,
      outcome_types:       knowledge.outcome_catalog.length,
      sla_patterns:        knowledge.sla_patterns.length,
      recurring_risks:     knowledge.recurring_risks.length,
      pilot_tenant_count:  knowledge.operational_knowledge.pilot_tenant_count
    },
    operational_pattern_summary: {
      event_patterns:    patterns.pattern_summary.event_patterns,
      outcome_patterns:  patterns.pattern_summary.outcome_patterns,
      sla_patterns:      patterns.pattern_summary.sla_patterns,
      risk_patterns:     patterns.pattern_summary.risk_patterns,
      aggregation:       patterns.aggregation_method
    },
    outcome_summary: {
      catalog:    knowledge.outcome_catalog,
      recurrence: patterns.outcome_recurrence
    },
    sla_knowledge_summary: {
      patterns:         knowledge.sla_patterns,
      compliance_rate:  knowledge.sla_snapshot.compliance_rate,
      breached:         knowledge.sla_snapshot.breached,
      at_risk:          knowledge.sla_snapshot.at_risk
    },
    risk_knowledge_summary: {
      recurring_risks: knowledge.recurring_risks,
      risk_recurrence: patterns.risk_recurrence
    },
    enterprise_knowledge_recommendation: {
      recommendation,
      maturity_score:    maturity.knowledge_maturity_score,
      maturity_level:    maturity.maturity_level,
      catalog_entries:   catalog.catalog_entry_count,
      assurance_score:   assurance.governance_assurance_score,
      prerequisites: {
        governance_preserved: assurance.sovereign_protection_verification.all_sovereigns_protected,
        runtime_cognitive:    false,
        inference_enabled:    false
      }
    },
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateEnterpriseKnowledgeReport,
  LAYER
};
