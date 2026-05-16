'use strict';

const { runRolloutAssessmentPack } = require('../orchestration/qualityRolloutOrchestrator');

async function runRolloutAnalyticsPack(companyId, userId, snapshot, opts) {
  return runRolloutAssessmentPack(companyId, userId, snapshot, opts);
}

module.exports = { runRolloutAnalyticsPack };
