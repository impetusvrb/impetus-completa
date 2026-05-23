'use strict';

const { evaluateRegulatoryCompliance } = require('../compliance/regulatoryComplianceEngine');
const { resolveLegalObligations } = require('../compliance/legalObligationRuntime');
const { superviseComplianceDeadlines } = require('../compliance/complianceDeadlineSupervisor');
const { scoreEnvironmentalRisk } = require('../compliance/environmentalRiskScorer');
const { buildEsgContextualGovernance } = require('./esgContextualGovernance');

function runEnvironmentalGovernanceRuntime(signalBundle = {}) {
  return {
    compliance: evaluateRegulatoryCompliance(signalBundle),
    legal: resolveLegalObligations(signalBundle),
    deadlines: superviseComplianceDeadlines(signalBundle),
    risk: scoreEnvironmentalRisk(signalBundle),
    esg: buildEsgContextualGovernance(signalBundle),
    assistive_only: true,
    no_auto_enforcement: true
  };
}

module.exports = { runEnvironmentalGovernanceRuntime };
