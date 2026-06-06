'use strict';

/**
 * AIOI-P3.2 — Enterprise Auditability Service (READ ONLY)
 *
 * Score composto: compliance + audit coverage + evidence chain + governance coverage.
 */

const { isValidUUID } = require('../../utils/security');
const auditMetrics = require('./aioiAuditabilityMetrics');
const complianceService = require('./aioiIntelligenceComplianceService');
const auditCoverageService = require('./aioiAuditCoverageService');
const evidenceChainService = require('./aioiEvidenceChainService');
const governanceCoverageService = require('./aioiGovernanceCoverageService');

const AUDITABILITY_WEIGHTS = Object.freeze({
  compliance:   0.25,
  coverage:     0.25,
  chain:        0.25,
  governance:   0.25
});

function computeAuditabilityScore({ complianceScore, coverageScore, chainScore, governanceScore }) {
  const raw =
    (complianceScore ?? 50) * AUDITABILITY_WEIGHTS.compliance +
    (coverageScore ?? 50) * AUDITABILITY_WEIGHTS.coverage +
    (chainScore ?? 50) * AUDITABILITY_WEIGHTS.chain +
    (governanceScore ?? 50) * AUDITABILITY_WEIGHTS.governance;
  return auditMetrics.clampScore(raw);
}

function buildEnterpriseAuditability(signals) {
  const auditability_score = computeAuditabilityScore(signals);
  return {
    auditability_score,
    auditability_level: auditMetrics.classifyAuditabilityLevel(auditability_score)
  };
}

async function getEnterpriseAuditability(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [complianceRes, coverageRes, chainRes, governanceRes] = await Promise.all([
      complianceService.getIntelligenceCompliance(companyId),
      auditCoverageService.getAuditCoverage(companyId),
      evidenceChainService.getEvidenceChain(companyId),
      governanceCoverageService.getGovernanceCoverage(companyId)
    ]);

    const failures = [complianceRes, coverageRes, chainRes, governanceRes].filter(r => !r.ok);
    if (failures.length) {
      auditMetrics.recordError(companyId, 'getEnterpriseAuditability', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const enterprise_auditability = buildEnterpriseAuditability({
      complianceScore:  complianceRes.intelligence_compliance.compliance_score,
      coverageScore:    coverageRes.audit_coverage.coverage_score,
      chainScore:       chainRes.evidence_chain.chain_score,
      governanceScore:  governanceRes.governance_coverage.governance_score
    });

    auditMetrics.recordAuditabilityAnalyzed(companyId);
    return { ok: true, enterprise_auditability };

  } catch (err) {
    auditMetrics.recordError(companyId, 'getEnterpriseAuditability', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  AUDITABILITY_WEIGHTS,
  computeAuditabilityScore,
  buildEnterpriseAuditability,
  getEnterpriseAuditability
};
