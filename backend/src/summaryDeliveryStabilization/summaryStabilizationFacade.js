'use strict';

const { runSummaryDeliveryStabilityEngine } = require('./summaryDeliveryStabilityEngine');

function stabilizeSummaryDelivery(summaryPayload = {}, ctx = {}) {
  const stability = runSummaryDeliveryStabilityEngine(summaryPayload, ctx);
  return { phase: 'Z.8', ...stability, payload_unchanged: true };
}

module.exports = { stabilizeSummaryDelivery };
