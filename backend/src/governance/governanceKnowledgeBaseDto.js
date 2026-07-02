'use strict';

/**
 * EVENT-GOVERNANCE-19 — DTO interno da Governance Knowledge Base (não exposto em APIs públicas).
 */

const crypto = require('crypto');

/**
 * @param {object} params
 * @returns {object}
 */
function buildGovernanceKnowledgeBaseDto(params) {
  const index = Array.isArray(params.index) ? params.index : [];
  const statistics = params.statistics || {};
  const crossReferences = Array.isArray(params.crossReferences) ? params.crossReferences : [];

  return Object.freeze({
    knowledgeBaseId: params.knowledgeBaseId || crypto.randomUUID(),
    companyId: params.companyId || null,
    generatedAt: params.generatedAt || new Date().toISOString(),
    index: Object.freeze(index.map((e) => Object.freeze({ ...e }))),
    statistics: Object.freeze({ ...statistics }),
    crossReferences: Object.freeze(crossReferences.map((r) => Object.freeze({ ...r }))),
    institutionalReport: params.institutionalReport
      ? Object.freeze({ ...params.institutionalReport })
      : null
  });
}

/**
 * @param {object} params
 * @returns {object}
 */
function buildInstitutionalKnowledgeReportDto(params) {
  return Object.freeze({
    reportId: params.reportId || crypto.randomUUID(),
    companyId: params.companyId || null,
    generatedAt: params.generatedAt || new Date().toISOString(),
    consolidatedHistory: Object.freeze(params.consolidatedHistory || {}),
    governanceEvolution: Object.freeze(params.governanceEvolution || {}),
    keyLearnings: Object.freeze(Array.isArray(params.keyLearnings) ? params.keyLearnings : []),
    recurringPatterns: Object.freeze(Array.isArray(params.recurringPatterns) ? params.recurringPatterns : []),
    historicalIndicators: Object.freeze(params.historicalIndicators || {}),
    crossReferences: Object.freeze(
      Array.isArray(params.crossReferences) ? params.crossReferences.map((r) => Object.freeze({ ...r })) : []
    )
  });
}

module.exports = {
  buildGovernanceKnowledgeBaseDto,
  buildInstitutionalKnowledgeReportDto
};
