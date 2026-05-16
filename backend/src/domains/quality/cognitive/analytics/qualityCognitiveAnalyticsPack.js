'use strict';

/**
 * Pacote analítico cognitivo — alias estável para consumidores internos.
 */
const { runCognitiveQualityPack } = require('../orchestration/qualityCognitiveOrchestrator');

async function runCognitiveAnalyticsPack(companyId, userId, signals, opts) {
  return runCognitiveQualityPack(companyId, userId, signals, opts);
}

module.exports = { runCognitiveAnalyticsPack };
