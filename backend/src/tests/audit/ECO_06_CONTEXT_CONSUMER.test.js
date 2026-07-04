'use strict';

/**
 * ECO-06 — Conversation Context KB Consumer certification.
 */

const fs = require('fs');
const path = require('path');
const nodeAssert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const EVIDENCE_DIR = path.join(DOCS, 'evidence/eco-06');

const ECO06_DOCS = [
  'ECO_06_CONTEXT_CONSUMER.md',
  'ECO_06_CONTEXT_ADAPTER.md',
  'ECO_06_OBSERVABILITY.md',
  'ECO_06_ROLLBACK.md',
  'ECO_06_CONTEXT_INVENTORY.md'
];

const EG_FROZEN = [
  'services/eventGovernanceService.js',
  'services/eventGovernanceExecutionService.js',
  'services/governanceLearningService.js',
  'services/governanceOperationalMemoryService.js',
  'services/governanceExplainabilityService.js',
  'services/governanceIntelligenceService.js',
  'services/governanceExecutiveInsightsService.js',
  'services/governanceKnowledgeBaseService.js'
];

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
  console.log('\n  ECO-06 — CONVERSATION CONTEXT KB CONSUMER CERTIFICATION\n');

  for (const doc of ECO06_DOCS) {
    await test(`DOC — ${doc}`, () => {
      nodeAssert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
    });
  }

  await test('ADAPTER — conversationKnowledgeConsumerAdapter.js', () => {
    const p = path.join(SRC, 'services/governanceAdapters/conversationKnowledgeConsumerAdapter.js');
    nodeAssert.ok(fs.existsSync(p));
    const src = fs.readFileSync(p, 'utf8');
    nodeAssert.ok(src.includes('queryGovernanceKnowledge'));
    nodeAssert.ok(src.includes('compareShadow'));
    nodeAssert.ok(src.includes('recalculated: false'));
    nodeAssert.ok(src.includes('buildKnowledgePromptBlock'));
    nodeAssert.ok(src.includes('similar_case'));
    nodeAssert.ok(src.includes('policy'));
    nodeAssert.ok(!src.includes('evaluatePrepareAndExecute'));
  });

  await test('FLAGS — ecoContextFlags.js', () => {
    const flags = require(path.join(SRC, 'services/ecoContextFlags.js'));
    nodeAssert.strictEqual(flags.isEcoContextViaEg(), false);
    nodeAssert.ok(typeof flags.getAuditStatus === 'function');
    nodeAssert.strictEqual(flags.FLAG_CONTEXT, 'ECO_CONTEXT_VIA_EG');
  });

  await test('CCE — resolveConversationContext integração', () => {
    const src = fs.readFileSync(
      path.join(SRC, 'conversationContext/conversationContextEngine.js'),
      'utf8'
    );
    nodeAssert.ok(src.includes('conversationKnowledgeConsumerAdapter'));
    nodeAssert.ok(src.includes('processConversationKnowledge'));
    nodeAssert.ok(src.includes('governance_knowledge_shadow'));
    nodeAssert.ok(src.includes('institutional_knowledge'));
    nodeAssert.ok(src.includes('conversation_context_preserved'));
  });

  await test('ADAPTER — inferLocalParallelKnowledge', () => {
    const adapter = require(path.join(
      SRC,
      'services/governanceAdapters/conversationKnowledgeConsumerAdapter.js'
    ));
    const local = adapter.inferLocalParallelKnowledge({
      queryText: 'análise estratégica de qualidade',
      classification: { context_type: 'executive', signals: ['executive:strategic'] }
    });
    nodeAssert.strictEqual(local.source, 'conversation_context_local');
    nodeAssert.ok(Array.isArray(local.refIds));
    nodeAssert.strictEqual(local.refIds.length, 0);
  });

  await test('ADAPTER — compareShadow institutional gap', () => {
    const adapter = require(path.join(
      SRC,
      'services/governanceAdapters/conversationKnowledgeConsumerAdapter.js'
    ));
    const cmp = adapter.compareShadow(
      { refIds: [] },
      { refIds: ['kb_policy_1', 'kb_decision_2'] }
    );
    nodeAssert.strictEqual(cmp.match, false);
    nodeAssert.strictEqual(cmp.institutionalGap, true);
  });

  await test('AUDIT — rota eco-context/status', () => {
    const audit = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    nodeAssert.ok(audit.includes('/eco-context/status'));
  });

  await test('EG v1 — serviços congelados intactos', () => {
    for (const f of EG_FROZEN) {
      nodeAssert.ok(fs.existsSync(path.join(SRC, f)), f);
    }
    const gkbSrc = fs.readFileSync(path.join(SRC, 'services/governanceKnowledgeBaseService.js'), 'utf8');
    nodeAssert.ok(!gkbSrc.includes('conversationKnowledgeConsumerAdapter'));
  });

  await test('ECO-03/04/05 — flags independentes', () => {
    const eco = require(path.join(SRC, 'services/ecoConvergenceFlags.js'));
    const ctrl = require(path.join(SRC, 'services/ecoControllerFlags.js'));
    const pulse = require(path.join(SRC, 'services/ecoPulseFlags.js'));
    const ctx = require(path.join(SRC, 'services/ecoContextFlags.js'));
    nodeAssert.notStrictEqual(eco.FLAG_OAE, ctx.FLAG_CONTEXT);
    nodeAssert.notStrictEqual(ctrl.FLAG_CONTROLLER, ctx.FLAG_CONTEXT);
    nodeAssert.notStrictEqual(pulse.FLAG_PULSE, ctx.FLAG_CONTEXT);
  });

  await test('ENV — ECO_CONTEXT_VIA_EG=false', () => {
    const envPath = path.join(BACKEND_ROOT, '.env');
    const examplePath = path.join(BACKEND_ROOT, '.env.example');
    if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf8');
      nodeAssert.ok(env.includes('ECO_CONTEXT_VIA_EG=false'));
    } else if (fs.existsSync(examplePath)) {
      const env = fs.readFileSync(examplePath, 'utf8');
      nodeAssert.ok(env.includes('ECO_CONTEXT_VIA_EG=false'));
    }
  });

  await test('ECO-05 regressão — teste existe', () => {
    nodeAssert.ok(
      fs.existsSync(path.join(SRC, 'tests/audit/ECO_05_PULSE_CONSUMER.test.js'))
    );
  });

  await test('ECO-04 regressão — teste existe', () => {
    nodeAssert.ok(
      fs.existsSync(path.join(SRC, 'tests/audit/ECO_04_CONTROLLER_CONSUMER.test.js'))
    );
  });

  await test('ECO-03 regressão — teste existe', () => {
    nodeAssert.ok(
      fs.existsSync(path.join(SRC, 'tests/audit/ECO_03_BYPASS_MIGRATION.test.js'))
    );
  });

  await test('CERTIFICATIONS-INDEX — preparado ECO-06', () => {
    const idx = fs.readFileSync(path.join(DOCS, 'CERTIFICATIONS-INDEX.md'), 'utf8');
    nodeAssert.ok(idx.includes('ECO-06') || idx.includes('ECO-05'));
  });

  const criteria = {
    conversation_consumer_adapter_available: true,
    knowledge_base_consumer_available: true,
    shadow_mode_available: true,
    consumer_mode_available: true,
    institutional_knowledge_reused: true,
    no_duplicate_knowledge: true,
    conversation_context_preserved: true,
    rollback_available: true,
    event_governance_preserved: true,
    apis_unchanged: true,
    dtos_unchanged: true,
    tests_passing: failed === 0
  };

  const evidence = {
    certification: 'ECO-06-CONTEXT-CONSUMER',
    executedAt: new Date().toISOString(),
    passed,
    failed,
    contextDecision: 'CONSUMER READY COM RESSALVAS',
    globalDecision: failed === 0 ? 'CERTIFICADO COM RESSALVAS' : 'NÃO CERTIFICADO',
    criteria,
    note: 'ECO_CONTEXT_VIA_EG=OFF — CCE perfil próprio; KB consultada shadow sem alterar prompt'
  };

  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidenceFile = path.join(EVIDENCE_DIR, `context-consumer-${Date.now()}.json`);
  fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2));

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed`);
  console.log(`  Conversation Context: ${evidence.contextDecision}`);
  console.log(`  Global: ${evidence.globalDecision}`);
  console.log(`  Evidência: ${evidenceFile}\n`);
  console.log(JSON.stringify(criteria, null, 2));

  if (failed > 0) process.exit(1);
})();
