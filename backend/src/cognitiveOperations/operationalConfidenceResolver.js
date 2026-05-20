'use strict';

const { computeDynamicConfidence } = require('./dynamicConfidenceEngine');
const { trackContextualConfidence } = require('./contextualConfidenceTracker');

function resolveOperationalConfidence(signals = {}) {
  const confidence = computeDynamicConfidence(signals);
  trackContextualConfidence(confidence.operational_confidence, { axis: signals.axis });
  return confidence;
}

module.exports = { resolveOperationalConfidence };
