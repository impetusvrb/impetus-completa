'use strict';

/**
 * AIOI-P3.2 — Auditability Read Model Service (READ ONLY)
 *
 * Agregador da camada de auditability + read model P3.1.
 */

const { isValidUUID } = require('../../utils/security');
const auditMetrics = require('./aioiAuditabilityMetrics');
const assuranceReadModel = require('./aioiAssuranceReadModelService');
const complianceService = require('./aioiIntelligenceComplianceService');
const auditCoverageService = require('./aioiAuditCoverageService');
const evidenceChainService = require('./aioiEvidenceChainService');
const governanceCoverageService = require('./aioiGovernanceCoverageService');
const enterpriseAuditabilityService = require('./aioiEnterpriseAuditabilityService');

async function getAuditabilityReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  auditMetrics.recordAuditabilityRequested(companyId);
  const startMs = Date.now();

  try {
    const [
      assuranceRes,
      complianceRes,
      coverageRes,
      chainRes,
      governanceRes,
      auditabilityRes
    ] = await Promise.all([
      assuranceReadModel.getAssuranceReadModel(companyId),
      complianceService.getIntelligenceCompliance(companyId),
      auditCoverageService.getAuditCoverage(companyId),
      evidenceChainService.getEvidenceChain(companyId),
      governanceCoverageService.getGovernanceCoverage(companyId),
      enterpriseAuditabilityService.getEnterpriseAuditability(companyId)
    ]);

    const failures = [assuranceRes, complianceRes, coverageRes, chainRes, governanceRes, auditabilityRes]
      .filter(r => !r.ok);
    if (failures.length) {
      auditMetrics.recordError(companyId, 'getAuditabilityReadModel', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    auditMetrics.recordAuditabilityCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      auditability_read_model: {
        assurance_read_model:       assuranceRes.assurance_read_model,
        intelligence_compliance:    complianceRes.intelligence_compliance,
        audit_coverage:             coverageRes.audit_coverage,
        evidence_chain:             chainRes.evidence_chain,
        governance_coverage:        governanceRes.governance_coverage,
        enterprise_auditability:    auditabilityRes.enterprise_auditability
      }
    };

  } catch (err) {
    auditMetrics.recordError(companyId, 'getAuditabilityReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getAuditabilityReadModel
};
