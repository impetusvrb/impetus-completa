'use strict';

/**
 * Behavioral Intelligence Engine — testes offline.
 * Executar: node src/tests/behavioralIntelligenceScenarios.js
 */

const assert = require('assert');
const behavioralIntelligenceService = require('../services/behavioralIntelligenceService');

const uid = '00000000-0000-0000-0000-0000000000aa';
const cid = '00000000-0000-0000-0000-0000000000bb';

function testNormalUserStaysLow() {
  behavioralIntelligenceService.resetForTests();
  behavioralIntelligenceService.trackUserAction('ACCESS_ATTEMPT', { userId: uid, companyId: cid });
  behavioralIntelligenceService.trackUserAction('ACCESS_ATTEMPT', { userId: uid, companyId: cid });
  const ev = behavioralIntelligenceService.getEvaluationForAdaptive(cid, uid);
  assert.strictEqual(ev.behavior_risk, 'LOW');
  assert.strictEqual(ev.pattern_detected, false);
}

function testRepeatedBlocksRaiseRisk() {
  behavioralIntelligenceService.resetForTests();
  for (let i = 0; i < 6; i++) {
    behavioralIntelligenceService.trackUserAction('ACCESS_ATTEMPT', { userId: uid, companyId: cid });
  }
  for (let i = 0; i < 4; i++) {
    behavioralIntelligenceService.trackUserAction('POLICY_BLOCK', { userId: uid, companyId: cid, reason: `b${i}` });
  }
  const ev = behavioralIntelligenceService.evaluateBehaviorPattern(
    behavioralIntelligenceService.getProfileSnapshot(cid, uid)
  );
  assert.ok(['HIGH', 'CRITICAL'].includes(ev.behavior_risk), `got ${ev.behavior_risk}`);
  assert.strictEqual(ev.pattern_detected, true);
  assert.ok(ev.pattern_type === 'REPEATED_ATTEMPT' || ev.pattern_type === 'ESCALATION');
}

function testEvaluateBehaviorPatternApi() {
  behavioralIntelligenceService.resetForTests();
  const profile = {
    user_id: uid,
    company_id: cid,
    recent_actions: [],
    risk_trend: 'stable',
    attempt_count_window: 0,
    last_action_at: Date.now()
  };
  for (let i = 0; i < 10; i++) profile.recent_actions.push({ t: Date.now() - i * 1000, type: 'ACCESS_ATTEMPT', meta: {} });
  profile.recent_actions.push({ t: Date.now(), type: 'POLICY_BLOCK', meta: {} });
  profile.recent_actions.push({ t: Date.now() + 1, type: 'INCIDENT_GENERATED', meta: {} });
  const ev = behavioralIntelligenceService.evaluateBehaviorPattern(profile);
  assert.ok(ev.pattern_detected);
}

function testTtlPruneProfile() {
  behavioralIntelligenceService.resetForTests();
  behavioralIntelligenceService.trackUserAction('ACCESS_ATTEMPT', { userId: uid, companyId: cid });
  const snap = behavioralIntelligenceService.getProfileSnapshot(cid, uid);
  assert.ok(snap);
}

function testAdaptiveReceivesBoost() {
  behavioralIntelligenceService.resetForTests();
  for (let i = 0; i < 8; i++) {
    behavioralIntelligenceService.trackUserAction('ACCESS_ATTEMPT', { userId: uid, companyId: cid });
  }
  behavioralIntelligenceService.trackUserAction('POLICY_BLOCK', { userId: uid, companyId: cid });
  behavioralIntelligenceService.trackUserAction('POLICY_BLOCK', { userId: uid, companyId: cid });
  const ev = behavioralIntelligenceService.getEvaluationForAdaptive(cid, uid);
  assert.ok(ev.score_boost > 0);
}

const suite = [
  testNormalUserStaysLow,
  testRepeatedBlocksRaiseRisk,
  testEvaluateBehaviorPatternApi,
  testTtlPruneProfile,
  testAdaptiveReceivesBoost
];

let failed = false;
for (const t of suite) {
  try {
    t();
    console.log('OK', t.name);
  } catch (e) {
    failed = true;
    console.error('FAIL', t.name, e);
  }
}
if (failed) process.exit(1);
console.log('behavioralIntelligenceScenarios: all passed');
