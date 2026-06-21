'use strict';

/**
 * EVENT-GOVERNANCE-01 — contrato DTO de decisão (sem persistência).
 */

const crypto = require('crypto');

/**
 * @param {object} params
 * @returns {object}
 */
function buildGovernanceDecisionDto(params) {
  const {
    eventId,
    eventType,
    category,
    severity,
    policyId,
    channels,
    escalationLevel,
    recipients,
    generatedAt,
    confidence
  } = params;

  const normalizedConfidence =
    Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : null;

  return Object.freeze({
    eventId: eventId || crypto.randomUUID(),
    eventType: String(eventType || 'unknown'),
    category: String(category || 'general'),
    severity: String(severity || 'info'),
    policyId: policyId || 'UNMATCHED',
    channels: Array.isArray(channels) ? [...channels] : [],
    escalationLevel: Number.isFinite(escalationLevel) ? escalationLevel : 0,
    recipients: Array.isArray(recipients) ? recipients.map((r) => ({ ...r })) : [],
    generatedAt: generatedAt || new Date().toISOString(),
    confidence: normalizedConfidence
  });
}

module.exports = {
  buildGovernanceDecisionDto
};
