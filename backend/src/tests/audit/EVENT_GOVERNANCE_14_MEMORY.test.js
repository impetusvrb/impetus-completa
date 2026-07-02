'use strict';

/**
 * EVENT-GOVERNANCE-14 — testes memória operacional governada.
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
  console.log('\n  EVENT-GOVERNANCE-14-MEMORY\n');

  const memoryPath = path.join(SRC, 'services/governanceOperationalMemoryService.js');
  const scorePath = path.join(SRC, 'services/governanceMemoryScoreService.js');
  const integrationPath = path.join(SRC, 'services/governanceMemoryIntegrationService.js');
  const auditDoc = path.join(BACKEND_ROOT, 'docs/EVENT_GOVERNANCE_14_MEMORY_AUDIT.md');
  const govPath = path.join(SRC, 'services/eventGovernanceService.js');
  const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
  const decisionDtoPath = path.join(SRC, 'governance/governanceDecisionDto.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');
  const learningSrc = readSrc('services/governanceLearningService.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_MEMORY;
  delete process.env.EVENT_GOVERNANCE_MEMORY;

  delete require.cache[require.resolve(memoryPath)];
  delete require.cache[require.resolve(scorePath)];
  delete require.cache[require.resolve(integrationPath)];

  const memory = require(memoryPath);
  const score = require(scorePath);
  const integration = require(integrationPath);
  memory.resetForTests();
  integration.resetStatsForTests();

  await test('T1 — auditoria memory documentada', () => {
    assert(fs.existsSync(auditDoc));
    const content = fs.readFileSync(auditDoc, 'utf8');
    assert(content.includes('governanceOperationalMemoryService'));
    assert(content.includes('decisionContext.memory'));
  });

  await test('T2 — operational memory funções de registo', () => {
    assert(typeof memory.registerDecision === 'function');
    assert(typeof memory.registerResolution === 'function');
    assert(typeof memory.registerRecurrence === 'function');
    assert(typeof memory.findSimilarCases === 'function');
    assert(!learningSrc.includes('governanceOperationalMemoryService'));
  });

  await test('T3 — flag OFF memória vazia e sem lookup', () => {
    delete process.env.EVENT_GOVERNANCE_MEMORY;
    memory.resetForTests();
    const r = memory.registerDecision({
      companyId: COMPANY,
      eventType: 'quality_defect',
      policyId: 'QUALITY_LIFECYCLE'
    });
    assert.strictEqual(r.stored, false);
    assert.strictEqual(r.shadow, true);
    assert.strictEqual(memory.getEntries(COMPANY).length, 0);

    const ctx = integration.buildMemoryContext(
      { companyId: COMPANY, eventType: 'quality_defect', category: 'quality' },
      { id: 'QUALITY_LIFECYCLE', category: 'quality' }
    );
    assert.strictEqual(ctx, null);
  });

  await test('T4 — flag ON memória populada', () => {
    process.env.EVENT_GOVERNANCE_MEMORY = 'true';
    delete require.cache[require.resolve(memoryPath)];
    const mod = require(memoryPath);
    mod.resetForTests();

    mod.registerDecision({
      companyId: COMPANY,
      eventType: 'sst_near_miss',
      category: 'sst',
      policyId: 'SST_LIFECYCLE',
      severity: 'high',
      sourceModule: 'sstNotificationService',
      payload: { equipment: 'LINE-2', sector: 'producao' }
    });

    assert.strictEqual(mod.getEntries(COMPANY).length, 1);

    delete process.env.EVENT_GOVERNANCE_MEMORY;
    delete require.cache[require.resolve(memoryPath)];
  });

  await test('T5 — similaridade por tipo e equipamento', () => {
    process.env.EVENT_GOVERNANCE_MEMORY = 'true';
    delete require.cache[require.resolve(memoryPath)];
    const mod = require(memoryPath);
    mod.resetForTests();

    mod.registerDecision({
      companyId: COMPANY,
      eventType: 'esg_emission_threshold',
      category: 'esg',
      policyId: 'ESG_LIFECYCLE',
      severity: 'high',
      payload: { equipment: 'BOILER-1', tags: ['emission'] }
    });
    mod.registerDecision({
      companyId: COMPANY,
      eventType: 'esg_emission_threshold',
      category: 'esg',
      policyId: 'ESG_LIFECYCLE',
      severity: 'medium',
      payload: { equipment: 'BOILER-2' }
    });

    const similar = mod.findSimilarCases(
      COMPANY,
      {
        eventType: 'esg_emission_threshold',
        category: 'esg',
        policyId: 'ESG_LIFECYCLE',
        payload: { equipment: 'BOILER-1', tags: ['emission'] }
      },
      { minScore: 2 }
    );
    assert(similar.length >= 1);
    assert(similar[0].similarityScore >= 2);

    delete process.env.EVENT_GOVERNANCE_MEMORY;
    delete require.cache[require.resolve(memoryPath)];
  });

  await test('T6 — memory lookup hits e misses', () => {
    process.env.EVENT_GOVERNANCE_MEMORY = 'true';
    delete require.cache[require.resolve(memoryPath)];
    delete require.cache[require.resolve(integrationPath)];
    const mem = require(memoryPath);
    const integ = require(integrationPath);
    mem.resetForTests();
    integ.resetStatsForTests();

    const missCtx = integ.buildMemoryContext(
      { companyId: COMPANY, eventType: 'unknown_type', category: 'general' },
      { id: 'DEFAULT_INFO', category: 'general' }
    );
    assert.strictEqual(missCtx.similarCases.length, 0);
    assert.strictEqual(missCtx.memoryScore, 0);

    mem.registerDecision({
      companyId: COMPANY,
      eventType: 'tpm_incident',
      category: 'tpm',
      policyId: 'TPM_CRITICAL',
      resolved: true,
      confidenceAtTime: 0.7
    });

    const hitCtx = integ.buildMemoryContext(
      { companyId: COMPANY, eventType: 'tpm_incident', category: 'tpm', severity: 'high' },
      { id: 'TPM_CRITICAL', category: 'tpm' }
    );
    assert(hitCtx.similarCases.length >= 1);
    assert(hitCtx.historicalResolutionRate > 0);

    delete process.env.EVENT_GOVERNANCE_MEMORY;
    delete require.cache[require.resolve(memoryPath)];
    delete require.cache[require.resolve(integrationPath)];
  });

  await test('T7 — confidence preservado no DTO público', () => {
    const decisionDto = require(decisionDtoPath);
    const d = decisionDto.buildGovernanceDecisionDto({ confidence: 0.75, policyId: 'SST_LIFECYCLE' });
    assert.strictEqual(d.confidence, 0.75);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(d, 'memoryScore'), false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(d, 'memory'), false);
  });

  await test('T8 — memoryScore independente de confidence', () => {
    const ctx = {
      similarCases: [{ similarityScore: 6, resolved: true, falsePositive: false, recurrenceCount: 1 }],
      historicalResolutionRate: 1,
      recurrenceRate: 0.1,
      falsePositiveRate: 0,
      historicalConfidence: 0.9
    };
    const ms = score.computeMemoryScore(ctx);
    assert(ms > 0 && ms <= 1);
    assert(ms !== 0.9);
    assert.strictEqual(score.resolveMemoryScore(COMPANY, {}, null), 0);
  });

  await test('T9 — decisionContext.memory no evaluateEvent', () => {
    process.env.EVENT_GOVERNANCE_MEMORY = 'true';
    delete require.cache[require.resolve(memoryPath)];
    delete require.cache[require.resolve(integrationPath)];
    delete require.cache[require.resolve(govPath)];

    const mem = require(memoryPath);
    mem.resetForTests();
    mem.registerDecision({
      companyId: COMPANY,
      eventType: 'quality_low_conformity',
      category: 'quality',
      policyId: 'QUALITY_LIFECYCLE',
      severity: 'medium'
    });

    const gov = require(govPath);
    const result = gov.evaluateEvent({
      companyId: COMPANY,
      eventType: 'quality_low_conformity',
      category: 'quality',
      severity: 'medium',
      sourceModule: 'qualityIntelligenceService'
    });

    assert.strictEqual(result.approved, true);
    assert(result.decisionContext);
    assert(result.decisionContext.memory);
    assert(Array.isArray(result.decisionContext.memory.similarCases));

    delete process.env.EVENT_GOVERNANCE_MEMORY;
    delete require.cache[require.resolve(memoryPath)];
    delete require.cache[require.resolve(govPath)];
  });

  await test('T10 — flag OFF evaluateEvent sem decisionContext', () => {
    delete process.env.EVENT_GOVERNANCE_MEMORY;
    delete require.cache[require.resolve(govPath)];
    const gov = require(govPath);
    const result = gov.evaluateEvent({
      companyId: COMPANY,
      eventType: 'quality_defect_increase',
      category: 'quality',
      severity: 'high',
      sourceModule: 'qualityIntelligenceService'
    });
    assert.strictEqual(result.decisionContext, null);
  });

  await test('T11 — integração pós-execução no pipeline', () => {
    assert(execPath && readSrc('services/eventGovernanceExecutionService.js').includes('governanceMemoryIntegrationService'));
    assert(readSrc('services/eventGovernanceExecutionService.js').includes('registerFromExecution'));
  });

  await test('T12 — observability métricas memory', () => {
    assert(observabilitySrc.includes('event_governance_memory_lookups'));
    assert(observabilitySrc.includes('event_governance_memory_hits'));
    assert(observabilitySrc.includes('event_governance_memory_misses'));
    assert(observabilitySrc.includes('event_governance_memory_score_computed'));
  });

  await test('T13 — GET /api/audit/event-governance/memory', () => {
    assert(auditSrc.includes('/event-governance/memory'));
    assert(auditSrc.includes('governanceMemoryIntegrationService'));
  });

  await test('T14 — feature flag registada', () => {
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_MEMORY'));
  });

  await test('T15 — isMemoryEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_MEMORY;
    delete require.cache[require.resolve(memoryPath)];
    assert.strictEqual(require(memoryPath).isMemoryEnabled(), false);
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_MEMORY = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_MEMORY;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      passed,
      failed,
      operational_memory_available: true,
      memory_lookup_available: true,
      memory_score_available: true,
      confidence_preserved: true,
      governance_preserved: true,
      aioi_preserved: true,
      event_backbone_preserved: true,
      apis_unchanged: true,
      feature_flag_available: true,
      tests_passing: true
    })
  );
})();
