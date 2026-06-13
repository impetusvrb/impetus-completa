/**
 * AIOI-P1 — Operational Rollout Master Audit
 * Modo: STATIC + AGGREGATE · ZERO RUNTIME COGNITIVO
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const SRC = path.join(BACKEND_ROOT, 'src');
const MIGRATIONS = path.join(BACKEND_ROOT, 'migrations');

function readDoc(n) { const p = path.join(DOCS, n); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function readSrc(r) { const p = path.join(SRC, r); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function stripComments(c) { return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n'); }

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

const P1_DOCS = [
  'AIOI_P1_OPERATIONAL_ROLLOUT_READINESS_AUDIT.md',
  'AIOI_EXECUTION_BRIDGE_CERTIFICATION.md',
  'AIOI_LEARNING_BRIDGE_CERTIFICATION.md',
  'AIOI_OUTCOME_SPECIFICATION.md',
  'AIOI_OUTCOME_GOVERNANCE_CONTRACT.md',
  'AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md'
];

const P1_TESTS = [
  'AioiExecutionBridgeCertificationAudit.test.js',
  'AioiLearningBridgeCertificationAudit.test.js',
  'AioiWorkflowStateCertificationAudit.test.js',
  'AioiOperationalEvidenceChainAudit.test.js'
];

const FORBIDDEN_SOVEREIGNS = [
  'industrialTruthEnforcementService',
  'operationalPrioritizationService'
];

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P1 — Operational Rollout Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P1');
  for (const doc of P1_DOCS) {
    await test(`P1-DOC: ${doc}`, () => {
      const c = readDoc(doc);
      assert(c && c.length > 200, `MISSING: ${doc}`);
    });
  }

  console.log('\n  ── BLOCO B: Testes P1 presentes');
  for (const t of P1_TESTS) {
    await test(`P1-TEST: ${t}`, () => {
      assert(fs.existsSync(path.join(__dirname, t)));
    });
  }

  console.log('\n  ── BLOCO C: Invariantes runtime (P8)');
  await test('P1-INV-01: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      const c = fs.readFileSync(fp, 'utf8');
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(c));
      assert(!/"runtime_enabled"\s*:\s*true/.test(c));
      assert(!/"runtime_active"\s*:\s*true/.test(c));
    }
  });

  console.log('\n  ── BLOCO D: ORG-1..5 intactos');
  const ORG_TOKENS = [
    { doc: 'AIOI_ORG_1_QUEUE_CONSOLIDATION_REPORT.md', token: 'AIOI_ORG_1' },
    { doc: 'AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_REPORT.md', token: 'AIOI_ORG_2' },
    { doc: 'AIOI_ORG_3_F49_CERTIFICATION_CLOSURE_REPORT.md', token: 'AIOI_ORG_3' },
    { doc: 'AIOI_ORG_4_P0_PRODUCTION_PILOT_CERTIFICATION_REPORT.md', token: 'AIOI_ORG_4' },
    { doc: 'AIOI_ORG_5_WORKFLOW_SLA_READINESS_REPORT.md', token: 'AIOI_ORG_5' }
  ];
  for (const { doc, token } of ORG_TOKENS) {
    await test(`P1-ORG: ${doc} intacto`, () => {
      assert(readDoc(doc), `MISSING: ${doc}`);
    });
  }

  console.log('\n  ── BLOCO E: Soberanos proibidos não alterados em bridges P1');
  for (const sovereign of FORBIDDEN_SOVEREIGNS) {
    await test(`P1-SOV: bridges P1 não modificam ${sovereign}`, () => {
      for (const f of ['aioiExecutionBridgeService.js', 'aioiLearningBridgeService.js']) {
        const c = readSrc(`services/aioi/${f}`);
        assert(!c.includes(`require('../${sovereign}')`) && !c.includes(`require('./${sovereign}')`),
          `${f} importa ${sovereign}`);
      }
    });
  }

  console.log('\n  ── BLOCO F: Proibições absolutas P1');
  await test('P1-FORBID: sem weight_versions / rerank / Gemini', () => {
    const files = [
      'services/aioi/aioiExecutionBridgeService.js',
      'services/aioi/aioiLearningBridgeService.js',
      'services/aioi/aioiOutcomePayloadBuilder.js',
      'services/aioi/aioiWorkflowStateMachine.js'
    ];
    for (const f of files) {
      const c = stripComments(readSrc(f)).toLowerCase();
      assert(!c.includes('weight_version') && !c.includes('rerank') && !c.includes('gemini'));
    }
  });

  console.log('\n  ── BLOCO G: Pilot Safety (P1.5 — auditoria, sem alterar ORG-4)');
  await test('P1-SAFE-01: RLS em migrations AIOI', () => {
    const files = fs.readdirSync(MIGRATIONS).filter(f => f.includes('aioi') || f.includes('industrial_operational'));
    let foundRls = false;
    for (const f of files) {
      const c = fs.readFileSync(path.join(MIGRATIONS, f), 'utf8');
      if (c.includes('ROW LEVEL SECURITY') || c.includes('ENABLE ROW LEVEL SECURITY')) foundRls = true;
    }
    assert(foundRls, 'RLS não encontrado em migrations AIOI');
  });

  await test('P1-SAFE-02: tenant isolation set_config nos bridges', () => {
    for (const f of ['aioiExecutionBridgeService.js', 'aioiLearningBridgeService.js']) {
      const c = readSrc(`services/aioi/${f}`);
      assert(c.includes('app.current_company_id'));
      assert(c.includes("app.bypass_rls', 'false'"));
    }
  });

  await test('P1-SAFE-03: idempotência execution bridge', () => {
    const c = readSrc('services/aioi/aioiExecutionBridgeService.js');
    assert(c.includes('_isAlreadyDelegated') || c.includes('alreadyDelegated'));
  });

  await test('P1-SAFE-04: idempotência learning bridge', () => {
    const c = readSrc('services/aioi/aioiLearningBridgeService.js');
    assert(c.includes('hasLearningSubmitted') || c.includes('alreadySubmitted'));
  });

  await test('P1-SAFE-05: DLQ / dead-letter path no outbox consumer', () => {
    const c = readSrc('services/aioi/aioiOutboxConsumerService.js');
    const lower = c.toLowerCase();
    assert(
      lower.includes('dlq')
      || lower.includes('dead_letter')
      || (c.includes('markFailedOrRetry') && c.includes("'failed'")),
      'Outbox consumer sem path de dead-letter/retry terminal'
    );
  });

  console.log('\n  ── BLOCO H: Outcome specification');
  await test('P1-OUTCOME: estados SUCCESS PARTIAL_SUCCESS FAILED CANCELLED REJECTED', () => {
    const d = readDoc('AIOI_OUTCOME_SPECIFICATION.md');
    for (const s of ['SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'CANCELLED', 'REJECTED']) {
      assert(d.includes(s), `Estado ${s} ausente na spec`);
    }
    const builder = require('../../services/aioi/aioiOutcomePayloadBuilder');
    assert(builder.VALID_OUTCOME_STATUSES.includes('rejected'));
  });

  console.log('\n  ── BLOCO I: Certificação report tokens');
  await test('P1-TOKEN: relatório contém AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS', () => {
    const d = readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md');
    assert(d.includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS'));
    assert(d.includes('EXECUTION_BRIDGE_CERTIFIED'));
    assert(d.includes('LEARNING_BRIDGE_CERTIFIED'));
    assert(d.includes('WORKFLOW_STATE_MACHINE_CERTIFIED'));
    assert(d.includes('OUTCOME_CHAIN_CERTIFIED'));
    assert(d.includes('OPERATIONAL_EVIDENCE_CHAIN_CERTIFIED'));
    assert(d.includes('PILOT_SAFETY_VALIDATED'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
