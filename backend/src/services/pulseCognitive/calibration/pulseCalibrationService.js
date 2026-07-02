/**
 * CERT-PULSE-04 — Facade de calibração cognitiva e certificação operacional.
 */
'use strict';

const { buildDimensionAuditMatrix } = require('./dimensionAudit');
const { runWeightSimulations } = require('./weightSimulation');
const {
  loadCompanyInsights,
  analyzeFalsePositives,
  analyzeFalseNegatives,
  checkTemporalConsistency,
  compareWithRealEvents
} = require('./calibrationAnalysis');
const { buildAdvancedExplainability } = require('./advancedExplainability');
const { buildReliabilityDashboard } = require('./reliabilityDashboard');
const { submitInsightValidation, listInsightValidations } = require('./humanValidationService');
const { GOVERNANCE } = require('../constants');

async function getDimensionAudit() {
  return buildDimensionAuditMatrix();
}

async function getCalibrationSimulations() {
  return runWeightSimulations();
}

async function getValidatedInsights(companyId, limit = 50) {
  const insights = await loadCompanyInsights(companyId, limit);
  const withoutEvidence = insights.filter((i) => !i.validation_bundle?.evidence_complete);
  return {
    ok: true,
    insights,
    summary: {
      total: insights.length,
      with_complete_evidence: insights.length - withoutEvidence.length,
      blocked_without_evidence: withoutEvidence.length
    },
    governance: GOVERNANCE
  };
}

async function getFalsePositiveReport(companyId) {
  return analyzeFalsePositives(companyId);
}

async function getFalseNegativeReport(companyId) {
  return analyzeFalseNegatives(companyId);
}

async function getTemporalConsistencyReport(companyId) {
  return checkTemporalConsistency(companyId);
}

async function getEventAlignmentReport(companyId) {
  return compareWithRealEvents(companyId);
}

async function getAdvancedExplainability(companyId, userId, teamMemberId) {
  return buildAdvancedExplainability(companyId, userId, teamMemberId);
}

async function getReliabilityDashboard(companyId) {
  return buildReliabilityDashboard(companyId);
}

async function getFullCalibrationReport(companyId) {
  const [
    audit,
    simulations,
    reliability,
    falsePos,
    falseNeg,
    temporal,
    alignment,
    insights
  ] = await Promise.all([
    getDimensionAudit(),
    getCalibrationSimulations(),
    getReliabilityDashboard(companyId),
    getFalsePositiveReport(companyId),
    getFalseNegativeReport(companyId),
    getTemporalConsistencyReport(companyId),
    getEventAlignmentReport(companyId),
    getValidatedInsights(companyId, 30)
  ]);

  return {
    ok: true,
    cert: 'CERT-PULSE-04',
    generated_at: new Date().toISOString(),
    dimension_audit: audit,
    weight_simulations: simulations,
    reliability_dashboard: reliability,
    false_positives: falsePos,
    false_negatives: falseNeg,
    temporal_consistency: temporal,
    event_alignment: alignment,
    insights_sample: insights,
    governance: {
      ...GOVERNANCE,
      weights_frozen: true,
      validation_only: true
    }
  };
}

module.exports = {
  getDimensionAudit,
  getCalibrationSimulations,
  getValidatedInsights,
  getFalsePositiveReport,
  getFalseNegativeReport,
  getTemporalConsistencyReport,
  getEventAlignmentReport,
  getAdvancedExplainability,
  getReliabilityDashboard,
  getFullCalibrationReport,
  submitInsightValidation,
  listInsightValidations
};
