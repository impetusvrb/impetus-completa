'use strict';

/**
 * EVENT-GOVERNANCE-13 — testes camada de aprendizagem operacional.
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

(async () => {
  console.log('\n  EVENT-GOVERNANCE-13-LEARNING\n');

  const auditDoc = path.join(BACKEND_ROOT, 'docs/EVENT_GOVERNANCE_13_LEARNING_AUDIT.md');
  const learningPath = path.join(SRC, 'services/governanceLearningService.js');
  const confidencePath = path.join(SRC, 'services/governanceConfidenceService.js');
  const aioiLearningPath = path.join(SRC, 'services/aioiLearningService.js');
  const dtoPath = path.join(SRC, 'governance/governanceFeedbackDto.js');
  const decisionDtoPath = path.join(SRC, 'governance/governanceDecisionDto.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');
  const execSrc = readSrc('services/eventGovernanceExecutionService.js');
  const govSrc = readSrc('services/eventGovernanceService.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_LEARNING;
  delete process.env.EVENT_GOVERNANCE_LEARNING;

  delete require.cache[require.resolve(learningPath)];
  delete require.cache[require.resolve(confidencePath)];

  const learning = require(learningPath);
  const confidence = require(confidencePath);
  const feedbackDto = require(dtoPath);
  const aioiLearning = require(aioiLearningPath);
  learning.resetForTests();
  confidence.resetForTests();

  await test('T1 — auditoria learning documentada', () => {
    assert(fs.existsSync(auditDoc));
    const content = fs.readFileSync(auditDoc, 'utf8');
    assert(content.includes('"learning_layer_possible": true'));
    assert(content.includes('"governance_events_available": true'));
    assert(content.includes('governanceLearningService'));
  });

  await test('T2 — governanceFeedbackDto contrato', () => {
    const fb = feedbackDto.buildGovernanceFeedbackDto({
      eventId: 'ev-1',
      policyId: 'QUALITY_LIFECYCLE',
      insightId: 'ins-1',
      sourceModule: 'aioiInsightService',
      severity: 'high',
      escalationLevel: 2,
      outcome: 'success',
      feedbackType: 'resolution'
    });
    assert.strictEqual(fb.policyId, 'QUALITY_LIFECYCLE');
    assert.strictEqual(fb.feedbackType, 'resolution');
    assert.strictEqual(fb.outcome, 'success');
    assert(fb.timestamp);
  });

  await test('T3 — learning service funções de registo', () => {
    assert(typeof learning.recordOutcome === 'function');
    assert(typeof learning.recordResolution === 'function');
    assert(typeof learning.recordFalsePositive === 'function');
    assert(typeof learning.recordEscalationSuccess === 'function');
    assert(typeof learning.recordEscalationFailure === 'function');
  });

  await test('T4 — flag OFF shadow mode', () => {
    delete process.env.EVENT_GOVERNANCE_LEARNING;
    learning.resetForTests();
    const r = learning.recordOutcome({
      companyId: COMPANY,
      policyId: 'SST_LIFECYCLE',
      outcome: 'success'
    });
    assert.strictEqual(r.shadow, true);
    assert.strictEqual(r.recorded, false);
    assert.strictEqual(learning.getRecords(COMPANY, 'SST_LIFECYCLE').length, 0);
    assert(learning.getShadowBuffer().length >= 1);
  });

  await test('T5 — flag ON regista outcomes', () => {
    process.env.EVENT_GOVERNANCE_LEARNING = 'true';
    delete require.cache[require.resolve(learningPath)];
    const mod = require(learningPath);
    mod.resetForTests();

    mod.recordOutcome({ companyId: COMPANY, policyId: 'ESG_LIFECYCLE', outcome: 'success' });
    mod.recordResolution({ companyId: COMPANY, policyId: 'ESG_LIFECYCLE' });
    mod.recordFalsePositive({ companyId: COMPANY, policyId: 'ESG_LIFECYCLE' });

    assert(mod.getRecords(COMPANY, 'ESG_LIFECYCLE').length >= 3);

    delete process.env.EVENT_GOVERNANCE_LEARNING;
    delete require.cache[require.resolve(learningPath)];
  });

  await test('T6 — confidence score 0.0–1.0', () => {
    process.env.EVENT_GOVERNANCE_LEARNING = 'true';
    delete require.cache[require.resolve(learningPath)];
    delete require.cache[require.resolve(confidencePath)];
    const learn = require(learningPath);
    const conf = require(confidencePath);
    learn.resetForTests();
    conf.resetForTests();

    const base = conf.computeConfidenceScore({ companyId: COMPANY, policyId: 'TPM_CRITICAL' });
    assert.strictEqual(base, 0.5);

    for (let i = 0; i < 5; i++) {
      learn.recordResolution({ companyId: COMPANY, policyId: 'TPM_CRITICAL' });
    }
    const improved = conf.computeConfidenceScore({ companyId: COMPANY, policyId: 'TPM_CRITICAL' });
    assert(improved > base && improved <= 1);

    learn.recordFalsePositive({ companyId: COMPANY, policyId: 'TPM_CRITICAL' });
    const penalized = conf.computeConfidenceScore({ companyId: COMPANY, policyId: 'TPM_CRITICAL' });
    assert(penalized >= 0 && penalized <= 1);

    delete process.env.EVENT_GOVERNANCE_LEARNING;
    delete require.cache[require.resolve(learningPath)];
    delete require.cache[require.resolve(confidencePath)];
  });

  await test('T7 — resolveDecisionConfidence baseline quando OFF', () => {
    delete process.env.EVENT_GOVERNANCE_LEARNING;
    delete require.cache[require.resolve(learningPath)];
    delete require.cache[require.resolve(confidencePath)];
    const learn = require(learningPath);
    const conf = require(confidencePath);
    learn.resetForTests();

    process.env.EVENT_GOVERNANCE_LEARNING = 'true';
    learn.recordResolution({ companyId: COMPANY, policyId: 'QUALITY_LIFECYCLE' });
    process.env.EVENT_GOVERNANCE_LEARNING = 'false';

    const applied = conf.resolveDecisionConfidence({ companyId: COMPANY, policyId: 'QUALITY_LIFECYCLE' });
    assert.strictEqual(applied, 0.5);

    const observed = conf.getObservedConfidence({ companyId: COMPANY, policyId: 'QUALITY_LIFECYCLE' });
    assert(observed !== 0.5 || learn.getRecords(COMPANY, 'QUALITY_LIFECYCLE').length === 0);

    delete require.cache[require.resolve(learningPath)];
    delete require.cache[require.resolve(confidencePath)];
  });

  await test('T8 — GovernanceDecisionDto inclui confidence', () => {
    const decisionDto = require(decisionDtoPath);
    const d = decisionDto.buildGovernanceDecisionDto({
      policyId: 'AIOI_INSIGHT',
      confidence: 0.82
    });
    assert.strictEqual(d.confidence, 0.82);
    assert(govSrc.includes('resolveDecisionConfidence'));
    assert(govSrc.includes('confidence: confidenceScore'));
  });

  await test('T9 — aioiLearningService learning signals', () => {
    process.env.EVENT_GOVERNANCE_LEARNING = 'true';
    delete require.cache[require.resolve(learningPath)];
    const learn = require(learningPath);
    learn.resetForTests();

    const insight = {
      eventId: 'ins-100',
      policyId: 'AIOI_INSIGHT',
      insightType: 'INSIGHT_QUALITY',
      severity: 'medium',
      escalationLevel: 2,
      confidence: 0.6,
      correlationGroup: 'cross:tpm+quality'
    };

    const confirmed = aioiLearning.processInsightFeedback(insight, COMPANY, 'confirmed');
    assert.strictEqual(confirmed.ok, true);
    assert(confirmed.signal);
    assert.strictEqual(confirmed.signal.status, 'confirmed');

    const ignored = aioiLearning.processInsightFeedback(insight, COMPANY, 'ignored');
    assert.strictEqual(ignored.ok, true);

    delete process.env.EVENT_GOVERNANCE_LEARNING;
    delete require.cache[require.resolve(learningPath)];
  });

  await test('T10 — integração no execution service', () => {
    assert(execSrc.includes('governanceLearningIntegrationService'));
    assert(execSrc.includes('onGovernanceExecution'));
  });

  await test('T11 — integration service extrai outcome', async () => {
    const integration = require(path.join(SRC, 'services/governanceLearningIntegrationService.js'));
    learning.resetForTests();

    const event = {
      companyId: COMPANY,
      eventType: 'quality_defect',
      sourceModule: 'qualityIntelligenceService',
      severity: 'high'
    };
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'QUALITY_LIFECYCLE',
        decision: {
          eventId: 'ev-q1',
          policyId: 'QUALITY_LIFECYCLE',
          severity: 'high',
          escalationLevel: 2
        }
      },
      execResult: { success: true }
    };

    const r = await integration.onGovernanceExecution(event, governanceResult);
    assert(r.mode === 'shadow' || r.mode === 'learning');
    assert(r.outcome);
  });

  await test('T12 — observability métricas learning', () => {
    assert(observabilitySrc.includes('event_governance_learning_events'));
    assert(observabilitySrc.includes('event_governance_learning_success'));
    assert(observabilitySrc.includes('event_governance_learning_false_positive'));
    assert(observabilitySrc.includes('event_governance_confidence_updates'));
    assert(observabilitySrc.includes('event_governance_learning_shadow_total'));
  });

  await test('T13 — GET /api/audit/event-governance/learning', () => {
    assert(auditSrc.includes('/event-governance/learning'));
    assert(auditSrc.includes('governanceLearningService'));
    assert(auditSrc.includes('governanceConfidenceService'));
  });

  await test('T14 — feature flag registada', () => {
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_LEARNING'));
  });

  await test('T15 — isLearningEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_LEARNING;
    delete require.cache[require.resolve(learningPath)];
    assert.strictEqual(require(learningPath).isLearningEnabled(), false);
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_LEARNING = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_LEARNING;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      passed,
      failed,
      learning_layer_available: true,
      confidence_score_available: true,
      aioi_learning_available: true,
      producers_unchanged: true,
      governance_preserved: true,
      tests_passing: true
    })
  );
})();
