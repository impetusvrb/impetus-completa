#!/usr/bin/env node
'use strict';

/**
 * Smoke rápido: circuit breaker, contrato soft fallback, métricas, chaos status.
 * Não contacta APIs externas quando IMPETUS_CHAOS_* desactivado e sem keys.
 */

process.env.IMPETUS_CB_DISABLED = process.env.IMPETUS_CB_DISABLED || 'false';

const circuitBreakerService = require('../src/services/circuitBreakerService');
const resilienceFallback = require('../src/services/resilienceFallback');
const resilienceMetricsService = require('../src/services/resilienceMetricsService');
const chaosRuntime = require('../src/middleware/chaosRuntime');
const resilienceFeedbackLoop = require('../src/services/resilienceFeedbackLoop');

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assert failed');
}

const env = resilienceFallback.buildSoftFallbackEnvelope(
  { message: 'teste', confidence: 55, explanation_layer: { confidence_score: 55 } },
  'ping'
);
assert(env.status === 'degraded', 'status');
assert(env.fallback === true, 'fallback');
assert(typeof env.confidence === 'number', 'confidence');
assert(env.message && env.content, 'message/content');
const ser = JSON.parse(resilienceFallback.serializeSoftFallbackContract(env, 'x', 'smoke'));
assert(ser.fallback === true && ser.status === 'degraded', 'serialize');

for (let i = 0; i < 12; i++) {
  circuitBreakerService.recordOutcome('gpt', false);
}
assert(circuitBreakerService.shouldSkip('gpt') === true || circuitBreakerService.getSnapshot().providers.gpt.state !== 'CLOSED', 'cb reacts');

chaosRuntime.getChaosStatus();
resilienceMetricsService.recordFallbackUsage('gpt_L1_retry_same');
resilienceMetricsService.recordFallbackUsage('gpt_L3_minimal_pipeline');
const snap = resilienceMetricsService.getPublicSnapshot();
assert(snap.fallback_tier_breakdown && snap.fallback_tier_breakdown.tiers, 'tier breakdown');

const fb = resilienceFeedbackLoop.getSnapshot();
assert(typeof fb.feedback_intensity === 'number', 'feedback intensity');

console.log('resilience-hardening-smoke OK', {
  circuit: circuitBreakerService.getSnapshot().providers.gpt.state,
  tiers: snap.fallback_tier_breakdown.tiers,
  chaos_enabled: chaosRuntime.getChaosStatus().enabled
});
