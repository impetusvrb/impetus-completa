'use strict';

/**
 * Consolidação complaint + council data_state + stats (smoke sem servidor).
 */

const assert = require('assert');
const {
  detectStrongComplaint,
  isOperationalQuery
} = require('../services/aiComplaintChatBridge');
const aiAnalytics = require('../services/aiAnalyticsService');

function bridgeWouldSkipComplaintPipeline(message) {
  const isOperational = isOperationalQuery(message);
  const hasStrongComplaintSignal = detectStrongComplaint(message);
  return isOperational && !hasStrongComplaintSignal;
}

function resolveDataStateLikeCouncil(result, req, res) {
  const data =
    req?.body?.data && typeof req.body.data === 'object' ? req.body.data : {};
  const context =
    req?.body?.context && typeof req.body.context === 'object' ? req.body.context : {};
  return (
    result?.meta?.decisionContext?.environmental?.data_state ||
    data?.metrics?.data_state ||
    data?.data_state ||
    context?.metrics?.data_state ||
    context?.data_state ||
    req?.body?.data?.metrics?.data_state ||
    req?.body?.context?.metrics?.data_state ||
    req?.context?.metrics?.data_state ||
    res?.locals?.context?.metrics?.data_state ||
    'unknown'
  );
}

function testHybridWhitelist() {
  const t1 = 'O risco que você falou está errado';
  assert.strictEqual(bridgeWouldSkipComplaintPipeline(t1), false, 'crítica forte + operacional não deve ser ignorada');

  const t2 = 'Quais ações devo tomar agora?';
  assert.strictEqual(bridgeWouldSkipComplaintPipeline(t2), true, 'operacional sem crítica forte deve ignorar complaint');
}

function testDataStateFallback() {
  const res = { locals: {} };
  const req = { body: { data: { metrics: { data_state: 'production_active' } } } };
  assert.strictEqual(resolveDataStateLikeCouncil({}, req, res), 'production_active');

  const req2 = { body: { context: { metrics: { data_state: 'degraded' } } } };
  assert.strictEqual(resolveDataStateLikeCouncil({}, req2, res), 'degraded');

  const reqFlat = { body: { data: { data_state: 'tenant_inactive' } } };
  assert.strictEqual(resolveDataStateLikeCouncil({}, reqFlat, res), 'tenant_inactive');

  const result = {
    meta: { decisionContext: { environmental: { data_state: 'from_result' } } }
  };
  assert.strictEqual(
    resolveDataStateLikeCouncil(result, { body: {} }, res),
    'from_result',
    'prioridade ao data_state vindo do resultado do council'
  );
}

function testComplaintStatsAccumulate() {
  const s0 = aiAnalytics.getRecentComplaintStats();
  aiAnalytics.registerComplaint({ isFalsePositive: false });
  const s1 = aiAnalytics.getRecentComplaintStats();
  assert.strictEqual(s1.total, s0.total + 1);
  const fp0 = s1.falsePositives;
  aiAnalytics.registerComplaint({ isFalsePositive: true });
  const s2 = aiAnalytics.getRecentComplaintStats();
  assert.strictEqual(s2.total, s1.total + 1);
  assert.strictEqual(s2.falsePositives, fp0 + 1);
}

function main() {
  testHybridWhitelist();
  testDataStateFallback();
  testComplaintStatsAccumulate();
  console.log('[COMPLAINT_CONSOLIDATION_SMOKE]', 'ok');
}

main();
