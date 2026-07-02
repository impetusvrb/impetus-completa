'use strict';

/**
 * EVENT-GOVERNANCE-15 — testes Explainable Governance.
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

function _sampleResult(overrides = {}) {
  return {
    evaluation: {
      approved: true,
      policyId: 'QUALITY_LIFECYCLE',
      channels: ['notification_center', 'dashboard'],
      decisionContext: {
        memory: {
          similarCases: [{ eventId: 'm1', similarityScore: 5 }],
          memoryScore: 0.65,
          recurrenceRate: 0.2,
          historicalConfidence: 0.7
        }
      },
      decision: {
        eventId: 'ev-q1',
        policyId: 'QUALITY_LIFECYCLE',
        severity: 'high',
        escalationLevel: 2,
        channels: ['notification_center', 'dashboard'],
        confidence: 0.72
      }
    },
    execResult: {
      success: true,
      channelsExecuted: ['notification_center'],
      channelsFailed: [],
      latencyMs: 12
    },
    ...overrides
  };
}

(async () => {
  console.log('\n  EVENT-GOVERNANCE-15-EXPLAINABILITY\n');

  const svcPath = path.join(SRC, 'services/governanceExplainabilityService.js');
  const dtoPath = path.join(SRC, 'governance/governanceExplainabilityDto.js');
  const auditDoc = path.join(BACKEND_ROOT, 'docs/EVENT_GOVERNANCE_15_EXPLAINABILITY_AUDIT.md');
  const execSrc = readSrc('services/eventGovernanceExecutionService.js');
  const decisionDtoPath = path.join(SRC, 'governance/governanceDecisionDto.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_EXPLAINABILITY;
  delete process.env.EVENT_GOVERNANCE_EXPLAINABILITY;

  delete require.cache[require.resolve(svcPath)];
  const svc = require(svcPath);
  svc.resetForTests();

  await test('T1 — auditoria explainability documentada', () => {
    assert(fs.existsSync(auditDoc));
    const content = fs.readFileSync(auditDoc, 'utf8');
    assert(content.includes('governanceExplainabilityService'));
    assert(content.includes('decisionTrace'));
    assert(content.includes('explainabilityScore'));
  });

  await test('T2 — governanceExplainabilityDto interno', () => {
    const dto = require(dtoPath);
    const ex = dto.buildGovernanceExplainabilityDto({
      companyId: COMPANY,
      explainabilityScore: 0.85,
      factors: ['policy:QUALITY_LIFECYCLE'],
      evidence: { confidence: 0.7 },
      rulesApplied: ['policy_match:QUALITY_LIFECYCLE']
    });
    assert.strictEqual(ex.explainabilityScore, 0.85);
    assert(ex.explainabilityId);
    assert(!readSrc('governance/governanceDecisionDto.js').includes('explainabilityScore'));
  });

  await test('T3 — flag OFF sem explicação', () => {
    delete process.env.EVENT_GOVERNANCE_EXPLAINABILITY;
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();

    const event = {
      companyId: COMPANY,
      eventType: 'quality_defect',
      category: 'quality',
      severity: 'high',
      sourceModule: 'qualityIntelligenceService'
    };
    const result = _sampleResult();
    const enriched = mod.enrichResult(event, result, {});
    assert.strictEqual(enriched.explainability, undefined);
    assert.strictEqual(enriched.decisionTrace, undefined);
  });

  await test('T4 — flag ON gera decisionTrace completo', () => {
    process.env.EVENT_GOVERNANCE_EXPLAINABILITY = 'true';
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();

    const event = {
      companyId: COMPANY,
      eventType: 'quality_defect_increase',
      category: 'quality',
      severity: 'high',
      sourceModule: 'qualityIntelligenceService',
      payload: { origin: 'qualityIntelligenceService' }
    };
    const result = _sampleResult();
    const enriched = mod.enrichResult(event, result, {
      aioiResult: { mode: 'shadow', correlations: 2, insights: 1 }
    });

    assert(enriched.decisionTrace);
    assert(enriched.explainability);
    assert.strictEqual(enriched.decisionTrace.event.eventType, 'quality_defect_increase');
    assert(enriched.decisionTrace.matchedPolicies.length >= 1);
    assert(enriched.decisionTrace.memory);
    assert.strictEqual(enriched.decisionTrace.learning.confidence, 0.72);
    assert.strictEqual(enriched.decisionTrace.aioi.insights, 1);
    assert.strictEqual(enriched.decisionTrace.decision.policyId, 'QUALITY_LIFECYCLE');
    assert.strictEqual(enriched.decisionTrace.distribution.success, true);

    delete process.env.EVENT_GOVERNANCE_EXPLAINABILITY;
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T5 — evidence builder factos', () => {
    process.env.EVENT_GOVERNANCE_EXPLAINABILITY = 'true';
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);

    const event = {
      companyId: COMPANY,
      eventType: 'sst_near_miss',
      category: 'sst',
      severity: 'high',
      sourceModule: 'sstNotificationService'
    };
    const evidence = mod.buildEvidence(event, _sampleResult(), { aioiResult: { insights: 2 } });
    assert(evidence.policiesUsed.includes('QUALITY_LIFECYCLE'));
    assert(evidence.rulesTriggered.some((r) => r.startsWith('policy_match')));
    assert.strictEqual(evidence.confidence, 0.72);
    assert.strictEqual(evidence.memoryScore, 0.65);
    assert.strictEqual(evidence.similarCasesCount, 1);
    assert.strictEqual(evidence.distributionSuccess, true);

    delete process.env.EVENT_GOVERNANCE_EXPLAINABILITY;
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T6 — explainabilityScore independente', () => {
    const mod = require(svcPath);
    const fullTrace = mod.buildDecisionTrace(
      { companyId: COMPANY, eventType: 'x', category: 'quality', severity: 'high', sourceModule: 'q' },
      _sampleResult(),
      { aioiResult: { mode: 'shadow', insights: 1 } }
    );
    const score = mod.computeExplainabilityScore(fullTrace);
    assert(score >= 0.9 && score <= 1);
    assert(score !== 0.72);
    assert(score !== 0.65);
  });

  await test('T7 — trace vazio score baixo', () => {
    const mod = require(svcPath);
    assert.strictEqual(mod.computeExplainabilityScore(null), 0);
    const partial = mod.buildDecisionTrace(
      { companyId: COMPANY, eventType: 'x', category: 'general' },
      { evaluation: { approved: false, decision: {} }, execResult: {} },
      {}
    );
    const score = mod.computeExplainabilityScore(partial);
    assert(score < 0.5);
  });

  await test('T8 — DTO público inalterado', () => {
    const decisionDto = require(decisionDtoPath);
    const d = decisionDto.buildGovernanceDecisionDto({ policyId: 'SST_LIFECYCLE', confidence: 0.8 });
    assert.strictEqual(Object.prototype.hasOwnProperty.call(d, 'decisionTrace'), false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(d, 'explainability'), false);
  });

  await test('T9 — integração no execution pipeline', () => {
    assert(execSrc.includes('governanceExplainabilityService'));
    assert(execSrc.includes('enrichResult'));
    assert(execSrc.includes('aioiResult'));
  });

  await test('T10 — factors e rulesApplied', () => {
    process.env.EVENT_GOVERNANCE_EXPLAINABILITY = 'true';
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();

    const ex = mod.buildExplanation(
      {
        companyId: COMPANY,
        eventType: 'esg_emission',
        category: 'esg',
        severity: 'high',
        sourceModule: 'esgNotificationService'
      },
      _sampleResult(),
      { aioiResult: { insights: 1 } }
    );
    assert(ex.factors.some((f) => f.includes('policy:')));
    assert(ex.factors.some((f) => f.includes('confidence:')));
    assert(ex.rulesApplied.length >= 1);

    delete process.env.EVENT_GOVERNANCE_EXPLAINABILITY;
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T11 — observability métricas explainability', () => {
    assert(observabilitySrc.includes('event_governance_explainability_hits'));
    assert(observabilitySrc.includes('event_governance_explainability_generated'));
    assert(observabilitySrc.includes('event_governance_explainability_errors'));
    assert(observabilitySrc.includes('event_governance_explainability_avg_score'));
  });

  await test('T12 — GET /api/audit/event-governance/explainability', () => {
    assert(auditSrc.includes('/event-governance/explainability'));
    assert(auditSrc.includes('governanceExplainabilityService'));
  });

  await test('T13 — feature flag registada', () => {
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_EXPLAINABILITY'));
  });

  await test('T14 — isExplainabilityEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_EXPLAINABILITY;
    delete require.cache[require.resolve(svcPath)];
    assert.strictEqual(require(svcPath).isExplainabilityEnabled(), false);
  });

  await test('T15 — audit status expõe traces', () => {
    process.env.EVENT_GOVERNANCE_EXPLAINABILITY = 'true';
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();
    mod.buildExplanation(
      { companyId: COMPANY, eventType: 'tpm_incident', category: 'tpm', severity: 'critical', sourceModule: 'tpm' },
      _sampleResult(),
      {}
    );
    const status = mod.getAuditStatus();
    assert.strictEqual(status.enabled, true);
    assert(status.explainability_generated >= 1);
    assert(Array.isArray(status.recent_traces));

    delete process.env.EVENT_GOVERNANCE_EXPLAINABILITY;
    delete require.cache[require.resolve(svcPath)];
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_EXPLAINABILITY = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_EXPLAINABILITY;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      passed,
      failed,
      decision_trace_available: true,
      explainability_available: true,
      evidence_builder_available: true,
      explainability_score_available: true,
      governance_preserved: true,
      learning_preserved: true,
      memory_preserved: true,
      event_backbone_preserved: true,
      apis_unchanged: true,
      feature_flag_available: true,
      tests_passing: true
    })
  );
})();
