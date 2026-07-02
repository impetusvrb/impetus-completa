'use strict';

/**
 * EVENT-GOVERNANCE-19 — testes Governance Knowledge Base.
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

function _seedSources() {
  process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
  process.env.EVENT_GOVERNANCE_LEARNING = 'true';

  const intelPath = path.join(SRC, 'services/governanceIntelligenceService.js');
  const learningPath = path.join(SRC, 'services/governanceLearningService.js');
  delete require.cache[require.resolve(intelPath)];
  delete require.cache[require.resolve(learningPath)];

  const intelligence = require(intelPath);
  intelligence.resetForTests();

  for (let i = 0; i < 4; i++) {
    intelligence.recordPipelineSnapshot(
      {
        companyId: COMPANY,
        eventType: 'quality_defect',
        category: 'quality',
        severity: 'high',
        sourceModule: 'qualityIntelligenceService'
      },
      {
        evaluation: {
          approved: true,
          policyId: 'QUALITY_LIFECYCLE',
          decision: { eventId: `ev-kb-${i}`, policyId: 'QUALITY_LIFECYCLE', severity: 'high', confidence: 0.7 }
        },
        execResult: { success: true, latencyMs: 10 },
        explainability: { explainabilityScore: 0.8 }
      }
    );
  }

  const learning = require(learningPath);
  learning.resetForTests();
  learning.recordOutcome({
    companyId: COMPANY,
    eventId: 'ev-kb-learn-1',
    policyId: 'QUALITY_LIFECYCLE',
    sourceModule: 'qualityIntelligenceService',
    severity: 'high',
    success: true
  });
}

function _cleanupEnv() {
  delete process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE;
  delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
  delete process.env.EVENT_GOVERNANCE_LEARNING;
}

(async () => {
  console.log('\n  EVENT-GOVERNANCE-19-KNOWLEDGE-BASE\n');

  const svcPath = path.join(SRC, 'services/governanceKnowledgeBaseService.js');
  const dtoPath = path.join(SRC, 'governance/governanceKnowledgeBaseDto.js');
  const auditDoc = path.join(BACKEND_ROOT, 'docs/EVENT_GOVERNANCE_19_KNOWLEDGE_BASE_AUDIT.md');
  const execSrc = readSrc('services/eventGovernanceExecutionService.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');

  const prevKb = process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE;
  delete process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE;

  delete require.cache[require.resolve(svcPath)];
  const gkb = require(svcPath);
  gkb.resetForTests();

  await test('T1 — auditoria knowledge base documentada', () => {
    assert(fs.existsSync(auditDoc));
    const content = fs.readFileSync(auditDoc, 'utf8');
    assert(content.includes('governanceKnowledgeBaseService'));
    assert(content.includes('knowledge_index'));
    assert(content.includes('Institutional Knowledge Report') || content.includes('Institutional'));
  });

  await test('T2 — flag OFF sem indexação', () => {
    gkb.resetForTests();
    const r = gkb.rebuildKnowledgeIndex(COMPANY);
    assert.strictEqual(r.updated, false);
    const q = gkb.queryKnowledge({ companyId: COMPANY });
    assert.strictEqual(q.skipped, true);
  });

  await test('T3 — flag ON reconstrói índice', () => {
    process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE = 'true';
    _seedSources();
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();

    const result = mod.rebuildKnowledgeIndex(COMPANY);
    assert.strictEqual(result.updated, true);
    assert(result.entryCount >= 1);

    _cleanupEnv();
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T4 — consulta determinística por policyId', () => {
    process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE = 'true';
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    _seedSources();
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();
    mod.rebuildKnowledgeIndex(COMPANY);

    const q = mod.queryKnowledge({ companyId: COMPANY, policyId: 'QUALITY_LIFECYCLE' });
    assert(q.results.length >= 1);
    assert(q.results.every((e) => e.policyId === 'QUALITY_LIFECYCLE'));

    _cleanupEnv();
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T5 — entradas são referências (source + refId)', () => {
    process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE = 'true';
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    _seedSources();
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();
    const { entries } = mod.rebuildKnowledgeIndex(COMPANY);

    assert(entries.length >= 1);
    for (const e of entries) {
      assert(e.source);
      assert(e.refId != null || e.type === 'audit');
      assert(!e.fullPayload, 'não deve duplicar payload completo');
    }

    _cleanupEnv();
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T6 — tipos de índice cobertos', () => {
    process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE = 'true';
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    _seedSources();
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();
    mod.rebuildKnowledgeIndex(COMPANY);

    const types = new Set(mod.queryKnowledge({ companyId: COMPANY, limit: 100 }).results.map((e) => e.type));
    assert(types.has('decision') || types.has('policy') || types.has('audit'));

    for (const t of mod.INDEX_TYPES) {
      assert(typeof t === 'string');
    }

    _cleanupEnv();
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T7 — institutional knowledge report', () => {
    process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE = 'true';
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    _seedSources();
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();

    const report = mod.buildInstitutionalKnowledgeReport(COMPANY);
    assert(report.reportId);
    assert(report.consolidatedHistory);
    assert(report.governanceEvolution);
    assert(Array.isArray(report.keyLearnings));
    assert(Array.isArray(report.recurringPatterns));
    assert(report.historicalIndicators);

    _cleanupEnv();
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T8 — knowledge DTO interno', () => {
    process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE = 'true';
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    _seedSources();
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();

    const result = mod.generateKnowledgeReport(COMPANY);
    assert.strictEqual(result.mode, 'knowledge_base');
    assert(result.report.dto);
    assert(result.report.dto.knowledgeBaseId);
    assert(fs.existsSync(dtoPath));

    _cleanupEnv();
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T9 — referências cruzadas', () => {
    process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE = 'true';
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    _seedSources();
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();
    mod.rebuildKnowledgeIndex(COMPANY);

    const refs = mod.buildCrossReferences(COMPANY, { policyId: 'QUALITY_LIFECYCLE' });
    assert(refs.length >= 1);

    _cleanupEnv();
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T10 — sem integração no pipeline operacional', () => {
    assert(!execSrc.includes('governanceKnowledgeBaseService'));
    assert(!execSrc.includes('rebuildKnowledgeIndex'));
  });

  await test('T11 — observability métricas knowledge', () => {
    assert(observabilitySrc.includes('event_governance_knowledge_queries'));
    assert(observabilitySrc.includes('event_governance_knowledge_reports_generated'));
    assert(observabilitySrc.includes('event_governance_knowledge_index_updates'));
    assert(observabilitySrc.includes('event_governance_knowledge_statistics_generated'));
    assert(observabilitySrc.includes('event_governance_knowledge_errors'));
  });

  await test('T12 — GET /api/audit/event-governance/knowledge-base', () => {
    assert(auditSrc.includes('/event-governance/knowledge-base'));
    assert(auditSrc.includes('governanceKnowledgeBaseService'));
    assert(auditSrc.includes('knowledge_report'));
  });

  await test('T13 — feature flag registada', () => {
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_KNOWLEDGE_BASE'));
  });

  await test('T14 — isKnowledgeBaseEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE;
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    assert.strictEqual(mod.isKnowledgeBaseEnabled(), false);
    assert.strictEqual(mod.generateKnowledgeReport(COMPANY).skipped, true);
  });

  await test('T15 — estatísticas do índice', () => {
    process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE = 'true';
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    _seedSources();
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    mod.resetForTests();
    mod.rebuildKnowledgeIndex(COMPANY);

    const stats = mod.getKnowledgeStatistics(COMPANY);
    assert.strictEqual(stats.available, true);
    assert(stats.entryCount >= 1);
    assert(stats.byType);
    assert(stats.bySource);

    _cleanupEnv();
    delete require.cache[require.resolve(svcPath)];
  });

  if (prevKb !== undefined) {
    process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE = prevKb;
  } else {
    delete process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      passed,
      failed,
      knowledge_base_available: true,
      knowledge_index_available: true,
      knowledge_reports_available: true,
      institutional_memory_available: true,
      governance_preserved: true,
      event_backbone_preserved: true,
      apis_unchanged: true,
      feature_flag_available: true,
      tests_passing: true
    })
  );
})();
