'use strict';

const { logPhaseI } = require('./phaseILogger');

const _promotions = [];
const MAX = Number(process.env.IMPETUS_GOVERNANCE_PROMOTION_TRACK_MAX || 500);

function trackPromotion(entry) {
  const record = {
    id: entry.id || `prom_${Date.now()}`,
    at: new Date().toISOString(),
    channel: entry.channel,
    tenant_id: entry.tenant_id || null,
    domain: entry.domain || null,
    approved_by: entry.approved_by || 'system',
    quality_gate_passed: entry.quality_gate_passed === true,
    readiness_score: entry.readiness_score,
    auto: false,
    ...entry
  };
  _promotions.push(record);
  if (_promotions.length > MAX) _promotions.shift();
  logPhaseI('GOVERNANCE_ACTIVATION_APPROVED', {
    channel: record.channel,
    tenant_id: record.tenant_id,
    promotion_id: record.id
  });
  return record;
}

function trackDenial(entry) {
  const record = {
    id: `deny_${Date.now()}`,
    at: new Date().toISOString(),
    ...entry
  };
  _promotions.push(record);
  logPhaseI('GOVERNANCE_ACTIVATION_DENIED', {
    channel: entry.channel,
    reason: entry.reason,
    tenant_id: entry.tenant_id
  });
  return record;
}

function listPromotions(limit = 50) {
  return _promotions.slice(-limit);
}

function clearForTests() {
  _promotions.length = 0;
}

module.exports = { trackPromotion, trackDenial, listPromotions, clearForTests };
