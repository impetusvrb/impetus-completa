'use strict';

/**
 * Fase G — Human Oversight + Explainability
 * npm run test:cognitive-governance-phase-g
 */

const path = require('path');
const fs = require('fs');

const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');

let passed = 0;
let failed = 0;

function assert(c, m, d) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
    if (d) console.log('       ', JSON.stringify(d).slice(0, 400));
  }
}

function loadFresh(p) {
  const r = require.resolve(p);
  delete require.cache[r];
  return require(p);
}

const QUALITY = {
  id: 'qg1',
  role: 'coordenador',
  functional_area: 'quality',
  hierarchy_level: 3,
  company_id: null
};

const ENV = {
  id: 'eg1',
  role: 'coordenador',
  functional_area: 'environmental',
  department: 'Meio Ambiente',
  hierarchy_level: 3,
  company_id: null
};

const HR = {
  id: 'hg1',
  role: 'gerente',
  functional_area: 'hr',
  hierarchy_level: 2,
  company_id: null
};

const SAFETY = {
  id: 'sg1',
  role: 'coordenador',
  functional_area: 'safety',
  department: 'Segurança do Trabalho',
  hierarchy_level: 3,
  company_id: null
};

const EXEC = {
  id: 'dg1',
  role: 'diretor',
  hierarchy_level: 1,
  company_id: null,
  permissions: ['*']
};

function enablePhaseG() {
  process.env.IMPETUS_GOVERNANCE_EXPLAINABILITY = 'on';
  process.env.IMPETUS_GOVERNANCE_TRACE = 'on';
  process.env.IMPETUS_GOVERNANCE_OVERSIGHT = 'on';
  process.env.IMPETUS_GOVERNANCE_DRIFT_DETECTION = 'on';
  process.env.IMPETUS_GOVERNANCE_AUDIT_FEED = 'on';
}

function testExplainabilityConsistency() {
  console.log('\n=== Explainability consistency ===');
  enablePhaseG();
  const engine = loadFresh('../../src/explainability/governanceExplainabilityEngine');
  const storage = loadFresh('../../src/governanceTrace/governanceTraceStorage');
  storage.clearForTests();

  const r = engine.explainGovernanceDecision({
    force: true,
    decision: 'deny',
    winning_layer: 'domain_authority',
    reason: 'cross_domain_blocked',
    domain: 'safety',
    blocked_content: 'environment_intelligence',
    channel: 'dashboard_chat',
    user_id: SAFETY.id
  });

  assert(r.enabled === true, 'explainability enabled');
  assert(r.explanation.decision === 'deny', 'decision deny');
  assert(r.explanation.winning_layer === 'domain_authority', 'winning layer');
  assert(r.explanation.human_summary?.includes('domain_authority'), 'human summary');
  assert(storage.getTrace(r.trace.trace_id), 'trace stored');
}

function testTraceIntegrity() {
  console.log('\n=== Trace integrity ===');
  const traceSvc = loadFresh('../../src/governanceTrace/governanceTraceService');
  const storage = loadFresh('../../src/governanceTrace/governanceTraceStorage');
  storage.clearForTests();

  const rec = traceSvc.recordTrace({
    user_id: 'u1',
    tenant_id: 't1',
    domain: 'quality',
    hierarchy_level: 3,
    decision: 'allow',
    policy_layer: 'rbac',
    affected_channel: 'dashboard_kpis',
    reason: 'allowed'
  });
  assert(rec.stored === true, 'stored');
  const got = traceSvc.getTrace(rec.trace_id);
  assert(got.user_id === 'u1', 'user_id');
  assert(got.trace_id === rec.trace_id, 'trace_id');
  assert(got.affected_channel === 'dashboard_kpis', 'channel');
}

function testTimelineOrdering() {
  console.log('\n=== Timeline ordering ===');
  const traceSvc = loadFresh('../../src/governanceTrace/governanceTraceService');
  const storage = loadFresh('../../src/governanceTrace/governanceTraceStorage');
  storage.clearForTests();

  traceSvc.recordTrace({ user_id: 'tl1', timestamp: '2026-01-01T10:00:00Z', decision: 'allow', affected_channel: 'a' });
  traceSvc.recordTrace({ user_id: 'tl1', timestamp: '2026-01-01T11:00:00Z', decision: 'deny', affected_channel: 'b' });
  const tl = traceSvc.getUserTimeline('tl1');
  assert(tl.timeline.length === 2, '2 events');
  assert(tl.timeline[0].timestamp < tl.timeline[1].timestamp, 'ordered');
}

function testPolicyPrecedenceExplanation() {
  console.log('\n=== Policy precedence explanation ===');
  const explainer = loadFresh('../../src/explainability/policyDecisionExplainer');
  const ex = explainer.explainPolicyPrecedence(
    {
      allowed: false,
      winning_layer: 'deny',
      denies: [{ layer: 'deny', scope: 'environment_intelligence', reason: 'safety_axis' }],
      audit: []
    },
    { domain: 'safety' }
  );
  assert(ex.decision === 'deny', 'deny explained');
  assert(ex.blocked_content === 'environment_intelligence', 'blocked content');
}

function testDriftDetection() {
  console.log('\n=== Drift detection ===');
  const drift = loadFresh('../../src/oversight/governanceDriftDetector');
  drift.resetForTests();
  for (let i = 0; i < 15; i++) drift.recordSample({ decision: 'allow', shadow_diverged: false });
  for (let i = 0; i < 15; i++) drift.recordSample({ decision: 'deny', shadow_diverged: true, sanitized: true });
  const r = drift.detectDrift({ force: true });
  assert(r.enabled === true, 'drift enabled');
  assert(typeof r.drift_detected === 'boolean', 'drift flag');
}

function testShadowReview() {
  console.log('\n=== Shadow review metrics ===');
  const review = loadFresh('../../src/policyEngine/observability/governanceShadowReview');
  const m = review.evaluateShadowReview({
    legacy_module_count: 10,
    governed_module_count: 6,
    legacy_kpi_count: 5,
    governed_kpi_count: 1
  });
  assert(m.governance_confidence_score >= 0 && m.governance_confidence_score <= 1, 'confidence score');
  assert(m.divergence_severity !== 'none', 'divergence detected');
}

function testAuditAppendOnly() {
  console.log('\n=== Audit append-only ===');
  const feed = loadFresh('../../src/audit/cognitiveGovernanceAuditFeed');
  feed.clearForTests();
  const a = feed.append({ trace_id: 't1', decision: 'deny' });
  const b = feed.append({ trace_id: 't2', decision: 'allow' });
  assert(a.appended === true, 'first append');
  assert(b.appended === true, 'second append');
  const list = feed.listFromMemory(10);
  assert(list.length === 2, 'two records');
  assert(list[0].trace_id === 't1', 'order preserved');
}

function testConflictDetection() {
  console.log('\n=== Conflict detection ===');
  const detector = loadFresh('../../src/oversight/governanceConflictDetector');
  const r = detector.detectConflicts({
    channel: 'test',
    legacy: { visible_modules: ['a', 'b', 'environment_intelligence'] },
    governed: { visible_modules: ['a'] }
  });
  assert(r.has_conflicts === true, 'conflict found');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  enablePhaseG();
  const engine = loadFresh('../../src/explainability/governanceExplainabilityEngine');
  const storage = loadFresh('../../src/governanceTrace/governanceTraceStorage');
  storage.clearForTests();

  const personas = [
    ['governance_trace_quality', QUALITY],
    ['governance_trace_environmental', ENV],
    ['governance_trace_hr', HR],
    ['governance_trace_safety', SAFETY],
    ['governance_trace_executive', EXEC]
  ];

  for (const [name, user] of personas) {
    const r = engine.explainGovernanceDecision({
      force: true,
      user_id: user.id,
      domain: user.functional_area || 'executive',
      hierarchy_level: user.hierarchy_level,
      decision: name.includes('safety') ? 'deny' : 'allow',
      winning_layer: name.includes('safety') ? 'domain_authority' : 'rbac',
      reason: name.includes('safety') ? 'cross_domain_blocked' : 'profile_allow',
      blocked_content: name.includes('safety') ? 'environment_intelligence' : null,
      channel: 'governance_test'
    });
    fs.writeFileSync(
      path.join(SNAPSHOT_DIR, `${name}.json`),
      JSON.stringify(
        {
          trace_id: r.trace?.trace_id,
          explanation: r.explanation
        },
        null,
        2
      )
    );
    console.log(`  SNAP  ${name}.json`);
  }
}

function main() {
  console.log('Cognitive Governance Phase G');
  testExplainabilityConsistency();
  testTraceIntegrity();
  testTimelineOrdering();
  testPolicyPrecedenceExplanation();
  testDriftDetection();
  testShadowReview();
  testAuditAppendOnly();
  testConflictDetection();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
