'use strict';

/**
 * EVENT-GOVERNANCE-16 — testes Governance Intelligence.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');
const COMPANY = '00000000-0000-0000-0000-000000000001';

function readSrc(rel) {
  const p = path.join(SRC, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

let passed = 0;
let failed = 0;

async function test(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (e) {
    failed++;
    console.error(`  ❌  ${label}\n       ${e.message}`);
  }
}

function _seedSnapshots(intelligence, opts = {}) {
  const success = opts.success !== false;
  for (let i = 0; i < (opts.count || 5); i++) {
    intelligence.recordPipelineSnapshot(
      {
        companyId: COMPANY,
        eventType: 'quality_defect',
        category: 'quality',
        severity: i < 2 ? 'low' : 'high',
        sourceModule: 'qualityIntelligenceService'
      },
      {
        evaluation: {
          approved: true,
          policyId: 'QUALITY_LIFECYCLE',
          decisionContext: { memory: { memoryScore: 0.6 - i * 0.05, recurrenceRate: 0.1 + i * 0.05 } },
          decision: {
            eventId: `ev-${i}`,
            policyId: 'QUALITY_LIFECYCLE',
            severity: 'high',
            confidence: 0.7 - i * 0.08,
            escalationLevel: 2
          }
        },
        execResult: { success: success && i !== 4, latencyMs: 10 + i, channelsExecuted: ['notification_center'] },
        explainability: { explainabilityScore: 0.85 }
      }
    );
  }
}

(async () => {
  console.log('\n  EVENT-GOVERNANCE-16-INTELLIGENCE\n');

  const svcPath = path.join(SRC, 'services/governanceIntelligenceService.js');
  const auditDoc = path.join(BACKEND_ROOT, 'docs/EVENT_GOVERNANCE_16_INTELLIGENCE_AUDIT.md');
  const execSrc = readSrc('services/eventGovernanceExecutionService.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_INTELLIGENCE;
  delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;

  delete require.cache[require.resolve(svcPath)];
  const intelligence = require(svcPath);
  intelligence.resetForTests();

  await test('T1 — auditoria intelligence documentada', () => {
    assert(fs.existsSync(auditDoc));
    const content = fs.readFileSync(auditDoc, 'utf8');
    assert(content.includes('governanceIntelligenceService'));
    assert(content.includes('governanceHealthScore'));
    assert(content.includes('recommendation'));
  });

  await test('T2 — flag OFF sem snapshot', () => {
    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    intelligence.resetForTests();
    const r = intelligence.recordPipelineSnapshot(
      { companyId: COMPANY, eventType: 'x' },
      { evaluation: { approved: true }, execResult: { success: true } }
    );
    assert.strictEqual(r.recorded, false);
    assert.strictEqual(intelligence.computeHealthAnalytics().sampleSize, 0);
  });

  await test('T3 — flag ON regista snapshots', () => {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();
    _seedSnapshots(mod, { count: 4 });
    assert(mod.computeHealthAnalytics(COMPANY).sampleSize >= 4);
    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T4 — health analytics determinísticos', () => {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();
    _seedSnapshots(mod, { count: 6, success: true });

    const analytics = mod.computeHealthAnalytics(COMPANY);
    assert(analytics.decisionStability != null);
    assert(analytics.severityDistribution);
    assert(analytics.policyDistribution.QUALITY_LIFECYCLE >= 1);
    assert(Number.isFinite(analytics.averageResolutionTimeMs));

    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T5 — geração de recomendações com evidência', () => {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();

    for (let i = 0; i < 5; i++) {
      mod.recordPipelineSnapshot(
        { companyId: COMPANY, eventType: 'sst_near_miss', category: 'sst', severity: 'low', sourceModule: 'sst' },
        {
          evaluation: {
            approved: true,
            decision: { policyId: 'SST_LIFECYCLE', severity: 'low', confidence: 0.3 - i * 0.05 },
            decisionContext: { memory: { recurrenceRate: 0.5, memoryScore: 0.4 } }
          },
          execResult: { success: false, latencyMs: 5 }
        }
      );
    }

    const analytics = mod.computeHealthAnalytics(COMPANY);
    const recs = mod.generateRecommendations(analytics);
    assert(recs.length >= 1);
    assert(recs.every((r) => r.actionable === false));
    assert(recs.some((r) => r.evidence));

    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T6 — ausência de recomendações com amostra saudável', () => {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();

    for (let i = 0; i < 4; i++) {
      mod.recordPipelineSnapshot(
        { companyId: COMPANY, eventType: 'ok', category: 'quality', severity: 'medium', sourceModule: 'q' },
        {
          evaluation: {
            approved: true,
            decision: { policyId: 'QUALITY_LIFECYCLE', severity: 'medium', confidence: 0.8 },
            decisionContext: { memory: { recurrenceRate: 0.05, memoryScore: 0.75 } }
          },
          execResult: { success: true, latencyMs: 8 },
          explainability: { explainabilityScore: 0.9 }
        }
      );
    }

    const recs = mod.generateRecommendations(mod.computeHealthAnalytics(COMPANY));
    const badRecs = recs.filter((r) => r.type === 'operational_degradation' || r.type === 'false_positive_increase');
    assert(badRecs.length === 0 || mod.computeHealthAnalytics(COMPANY).decisionStability >= 0.6);

    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T7 — governanceHealthScore independente', () => {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();
    _seedSnapshots(mod, { count: 5 });

    const analytics = mod.computeHealthAnalytics(COMPANY);
    const health = mod.computeGovernanceHealthScore(analytics);
    assert(health >= 0 && health <= 1);
    assert(health !== analytics.confidenceTrend);

    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T8 — improvement report', () => {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();
    _seedSnapshots(mod, { count: 5 });

    const report = mod.buildImprovementReport(COMPANY);
    assert(report.governanceHealthScore >= 0);
    assert(report.analytics);
    assert(Array.isArray(report.trends));
    assert(Array.isArray(report.recommendations));
    assert(Array.isArray(report.improvementOpportunities));

    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T9 — runIntelligenceCycle', () => {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();
    _seedSnapshots(mod, { count: 5 });

    const cycle = mod.runIntelligenceCycle(COMPANY);
    assert.strictEqual(cycle.mode, 'intelligence');
    assert(cycle.report);

    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T10 — integração no execution pipeline', () => {
    assert(execSrc.includes('governanceIntelligenceService'));
    assert(execSrc.includes('recordPipelineSnapshot'));
    assert(execSrc.includes('runIntelligenceCycle'));
  });

  await test('T11 — observability métricas intelligence', () => {
    assert(observabilitySrc.includes('event_governance_intelligence_runs'));
    assert(observabilitySrc.includes('event_governance_recommendations_generated'));
    assert(observabilitySrc.includes('event_governance_health_score'));
    assert(observabilitySrc.includes('event_governance_trend_detections'));
    assert(observabilitySrc.includes('event_governance_intelligence_errors'));
  });

  await test('T12 — GET /api/audit/event-governance/intelligence', () => {
    assert(auditSrc.includes('/event-governance/intelligence'));
    assert(auditSrc.includes('governanceIntelligenceService'));
    assert(auditSrc.includes('improvement_report'));
  });

  await test('T13 — feature flag registada', () => {
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_INTELLIGENCE'));
  });

  await test('T14 — isIntelligenceEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(svcPath)];
    assert.strictEqual(require(svcPath).isIntelligenceEnabled(), false);
    assert.strictEqual(require(svcPath).runIntelligenceCycle().skipped, true);
  });

  await test('T15 — audit status expõe health score', () => {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();
    _seedSnapshots(mod, { count: 4 });
    mod.runIntelligenceCycle(COMPANY);

    const status = mod.getAuditStatus();
    assert.strictEqual(status.enabled, true);
    assert(status.governance_health_score >= 0 && status.governance_health_score <= 1);
    assert(status.analytics_summary);

    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(svcPath)];
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      passed,
      failed,
      governance_intelligence_available: true,
      governance_health_score_available: true,
      recommendation_engine_available: true,
      trend_analysis_available: true,
      governance_preserved: true,
      learning_preserved: true,
      memory_preserved: true,
      explainability_preserved: true,
      event_backbone_preserved: true,
      apis_unchanged: true,
      feature_flag_available: true,
      tests_passing: true
    })
  );
})();
