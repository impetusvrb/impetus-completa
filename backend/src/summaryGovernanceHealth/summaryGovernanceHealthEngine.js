'use strict';

const { assessSummaryGovernanceMaturity } = require('./summaryGovernanceMaturity');
const { assessSummaryNarrativeConfidence } = require('./summaryNarrativeConfidence');
const { assessSummaryOperationalReliability } = require('./summaryOperationalReliability');

function runSummaryGovernanceHealthEngine(pack = {}) {
  const maturity = assessSummaryGovernanceMaturity(pack);
  const confidence = assessSummaryNarrativeConfidence(pack);
  const reliability = assessSummaryOperationalReliability(pack);
  const health_score = Number(
    ((maturity.maturity_score + confidence.narrative_confidence + reliability.operational_reliability) / 3).toFixed(4)
  );
  return { health_score, maturity, confidence, reliability, governance_integrity: health_score >= 0.68 };
}

module.exports = { runSummaryGovernanceHealthEngine };
