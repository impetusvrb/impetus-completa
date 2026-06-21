'use strict';

/**
 * EVENT-GOVERNANCE-12 — contrato DTO cognitivo para insights AIOI sobre eventos governados.
 */

const crypto = require('crypto');

const INSIGHT_TYPES = Object.freeze([
  'INSIGHT_OPERATIONAL',
  'INSIGHT_QUALITY',
  'INSIGHT_SAFETY',
  'INSIGHT_ESG',
  'INSIGHT_FINANCIAL',
  'INSIGHT_EXECUTIVE'
]);

/**
 * @param {object} params
 * @returns {object}
 */
function buildGovernedEventInsightDto(params) {
  const insightType = String(params.insightType || 'INSIGHT_OPERATIONAL');
  const confidence = Number(params.confidence);
  const normalizedConfidence =
    Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : 0.5;

  return Object.freeze({
    eventId: params.eventId || crypto.randomUUID(),
    eventType: String(params.eventType || 'aioi_insight_generic'),
    policyId: String(params.policyId || 'AIOI_INSIGHT'),
    severity: String(params.severity || 'medium'),
    escalationLevel: Number.isFinite(params.escalationLevel) ? params.escalationLevel : 0,
    sourceModule: String(params.sourceModule || 'aioiInsightService'),
    timestamp: params.timestamp || new Date().toISOString(),
    correlationGroup: params.correlationGroup || null,
    insightType: INSIGHT_TYPES.includes(insightType) ? insightType : 'INSIGHT_OPERATIONAL',
    confidence: normalizedConfidence,
    title: params.title || '',
    message: params.message || '',
    relatedEventIds: Array.isArray(params.relatedEventIds) ? [...params.relatedEventIds] : [],
    correlationKind: params.correlationKind || null
  });
}

module.exports = {
  INSIGHT_TYPES,
  buildGovernedEventInsightDto
};
