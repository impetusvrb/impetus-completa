'use strict';

/**
 * Smoke Fase 9 — sem servidor (kill switch, aprovação prévia, passo, piso, rollback).
 */

const assert = require('assert');
const autonomous = require('../services/autonomousOptimizationService');
const adaptive = require('../services/adaptiveTuningService');
const supervised = require('../services/supervisedLearningService');
const aiAnalytics = require('../services/aiAnalyticsService');

function resetEnv(prev) {
  for (const k of Object.keys(prev)) {
    if (prev[k] === undefined) delete process.env[k];
    else process.env[k] = prev[k];
  }
}

function testNoApprovalNoOp() {
  const prev = { ...process.env };
  process.env.IMPETUS_AUTONOMOUS_OPTIMIZATION_ENABLED = 'true';
  adaptive.clearApprovedLearningAdjustments();
  const r = autonomous.evaluateAutonomousOptimization();
  assert.strictEqual(r, null);
  resetEnv(prev);
}

function testKillSwitch() {
  const prev = { ...process.env };
  process.env.IMPETUS_AUTONOMOUS_OPTIMIZATION_ENABLED = 'false';
  adaptive.clearApprovedLearningAdjustments();
  const id = supervised.storeProposal({
    type: 'strategy_adjustment',
    suggestion: 'test',
    action: 'reduce_assertiveness'
  });
  supervised.approveProposal(id, { userId: 'smoke' });
  const r = autonomous.evaluateAutonomousOptimization();
  assert.strictEqual(r, null);
  resetEnv(prev);
}

function testSmallStepAndFloor() {
  const prev = { ...process.env };
  process.env.IMPETUS_AUTONOMOUS_OPTIMIZATION_ENABLED = 'true';
  process.env.IMPETUS_SUPERVISED_LEARNING_APPLY = 'true';
  adaptive.clearApprovedLearningAdjustments();
  const id = supervised.storeProposal({
    type: 'strategy_adjustment',
    suggestion: 'test',
    action: 'reduce_assertiveness'
  });
  supervised.approveProposal(id, { userId: 'smoke' });

  const a1 = autonomous.evaluateAutonomousOptimization();
  assert.strictEqual(a1, 0.98);
  let adj = adaptive.getApprovedLearningAdjustments();
  assert.strictEqual(adj.confidenceFactor, 0.98);

  let last = a1;
  for (let i = 0; i < 30; i++) {
    const n = autonomous.evaluateAutonomousOptimization();
    if (n == null) break;
    assert.ok(n < last);
    assert.ok(n >= autonomous.effectiveConfidenceFloor() - 1e-9);
    last = n;
  }
  adj = adaptive.getApprovedLearningAdjustments();
  assert.ok(adj.confidenceFactor >= autonomous.effectiveConfidenceFloor() - 1e-9);

  resetEnv(prev);
}

function testRollback() {
  const prev = { ...process.env };
  process.env.IMPETUS_AUTONOMOUS_OPTIMIZATION_ENABLED = 'true';
  adaptive.clearApprovedLearningAdjustments();
  adaptive.mergeAutonomousOptimizationPatch({ confidenceFactor: 0.9 });
  aiAnalytics.runAutonomousEvaluationCycle({ lowConfidenceRate: 0.61 });
  const adj = adaptive.getApprovedLearningAdjustments();
  assert.strictEqual(adj.confidenceFactor, 1);
  resetEnv(prev);
}

function main() {
  testNoApprovalNoOp();
  testKillSwitch();
  testSmallStepAndFloor();
  testRollback();
  console.log('[AUTONOMOUS_OPTIMIZATION_SMOKE]', 'ok');
}

main();
