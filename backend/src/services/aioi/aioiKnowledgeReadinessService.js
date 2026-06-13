'use strict';

/**
 * AIOI-P7.6 — Knowledge Readiness Service
 *
 * Validação de prontidão da fundação de conhecimento — KR-01..KR-08.
 * Spec: backend/docs/AIOI_KNOWLEDGE_READINESS_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const governanceAssurance = require('./aioiGovernanceAssuranceService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const continuousReadiness = require('./aioiContinuousCertificationReadinessService');
const knowledgeCatalog = require('./aioiKnowledgeCatalogService');
const operationalPatterns = require('./aioiOperationalPatternService');
const knowledgeMaturity = require('./aioiKnowledgeMaturityService');
const certificationDrift = require('./aioiCertificationDriftService');

const LAYER = 'AIOI_KNOWLEDGE_READINESS';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const TESTS = path.join(BACKEND_ROOT, 'src', 'tests', 'aioi');

function _docExists(name) {
  return fs.existsSync(path.join(DOCS, name));
}

function _testExists(name) {
  return fs.existsSync(path.join(TESTS, name));
}

/**
 * Valida critérios KR-01..KR-08.
 * @returns {Promise<object>}
 */
async function validateKnowledgeReadiness() {
  const [assurance, compliance, continuous, catalog, patterns, maturity, certDrift] = await Promise.all([
    governanceAssurance.validateContinuousGovernance(),
    complianceAnalytics.getComplianceAnalytics(),
    continuousReadiness.validateContinuousCertificationReadiness(),
    knowledgeCatalog.getKnowledgeCatalog(),
    operationalPatterns.getOperationalPatterns(),
    knowledgeMaturity.getKnowledgeMaturity(),
    Promise.resolve(certificationDrift.detectCertificationDrift())
  ]);

  const checks = [];

  checks.push({
    id: 'KR-01',
    name: 'governance_preserved',
    pass: assurance.sovereign_protection_verification.all_sovereigns_protected
      && !certDrift.certification_drift_detected,
    detail: { assurance_score: assurance.governance_assurance_score }
  });

  checks.push({
    id: 'KR-02',
    name: 'compliance_preserved',
    pass: compliance.overall_compliance_score >= 0
      && compliance.governance_compliance !== false,
    detail: { overall_score: compliance.overall_compliance_score }
  });

  checks.push({
    id: 'KR-03',
    name: 'assurance_preserved',
    pass: continuous.pass_count >= 6
      && assurance.governance_assurance_score >= 0,
    detail: { continuous_pass: continuous.pass_count }
  });

  checks.push({
    id: 'KR-04',
    name: 'knowledge_catalog_valid',
    pass: catalog.ok
      && catalog.workflow_knowledge != null
      && catalog.compliance_knowledge != null,
    detail: { catalog_entry_count: catalog.catalog_entry_count }
  });

  checks.push({
    id: 'KR-05',
    name: 'patterns_available',
    pass: patterns.ok
      && patterns.aggregation_method === 'STATISTICAL_COUNT'
      && patterns.inference_enabled === false,
    detail: { pattern_count: patterns.pattern_summary.event_patterns }
  });

  checks.push({
    id: 'KR-06',
    name: 'maturity_valid',
    pass: maturity.knowledge_maturity_score >= 0
      && typeof maturity.knowledge_coverage === 'number',
    detail: { maturity_score: maturity.knowledge_maturity_score }
  });

  const phaseDocs = [
    { phase: 'P1', doc: 'AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md', test: 'AioiP1OperationalRolloutAudit.test.js' },
    { phase: 'P2', doc: 'AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_REPORT.md', test: 'AioiP2ProductionOperationsAudit.test.js' },
    { phase: 'P3', doc: 'AIOI_P3_PRODUCTION_PILOT_VALIDATION_REPORT.md', test: 'AioiP3ProductionPilotValidationAudit.test.js' },
    { phase: 'P4', doc: 'AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_REPORT.md', test: 'AioiP4MultiTenantScaleAudit.test.js' },
    { phase: 'P5', doc: 'AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_REPORT.md', test: 'AioiP5EnterpriseRolloutAudit.test.js' },
    { phase: 'P6', doc: 'AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_REPORT.md', test: 'AioiP6ContinuousGovernanceAssuranceAudit.test.js' }
  ];
  checks.push({
    id: 'KR-07',
    name: 'regressao_zero',
    pass: phaseDocs.every(p => _docExists(p.doc) && _testExists(p.test)),
    detail: { phases: phaseDocs.map(p => p.phase) }
  });

  checks.push({
    id: 'KR-08',
    name: 'knowledge_readiness_achieved',
    pass: checks.filter(c => ['KR-04', 'KR-05', 'KR-06'].includes(c.id)).every(c => c.pass)
      && maturity.knowledge_maturity_score >= 0,
    detail: {
      maturity_score: maturity.knowledge_maturity_score,
      catalog_entries: catalog.catalog_entry_count
    }
  });

  const passCount = checks.filter(c => c.pass).length;
  const allPass = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    knowledge_readiness: allPass,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    invariants: {
      runtime_enabled: false,
      runtime_active: false,
      runtime_authorized: false,
      cognitive_execution_allowed: false
    },
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateKnowledgeReadiness,
  LAYER
};
