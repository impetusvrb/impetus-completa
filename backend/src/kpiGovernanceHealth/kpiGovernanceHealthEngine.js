'use strict';
const { assessKpiGovernanceMaturity } = require('./kpiGovernanceMaturity');
const { assessKpiDeliveryConfidence } = require('./kpiDeliveryConfidence');
const { assessKpiOperationalReliability } = require('./kpiOperationalReliability');
function runKpiGovernanceHealthEngine(pack = {}) {
  const maturity = assessKpiGovernanceMaturity(pack);
  const confidence = assessKpiDeliveryConfidence(pack);
  const reliability = assessKpiOperationalReliability(pack);
  const health_score = Number(((maturity.maturity_score + confidence.delivery_confidence + reliability.operational_reliability) / 3).toFixed(4));
  return { health_score, maturity, confidence, reliability, governance_integrity: health_score >= 0.7 };
}
module.exports = { runKpiGovernanceHealthEngine };
