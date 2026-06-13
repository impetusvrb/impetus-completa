/**
 * AIOI-P2 — Production Operations Master Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const SRC = path.join(BACKEND_ROOT, 'src');

function readDoc(n) { const p = path.join(DOCS, n); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function readSrc(r) { const p = path.join(SRC, r); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function stripComments(c) { return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n'); }

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

const P2_DOCS = [
  'AIOI_P2_PRODUCTION_OPERATIONS_READINESS_AUDIT.md',
  'AIOI_WORKER_GOVERNANCE_CONTRACT.md',
  'AIOI_PILOT_GOVERNANCE_CONTRACT.md',
  'AIOI_OPERATIONAL_OBSERVABILITY_SPECIFICATION.md',
  'AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_REPORT.md'
];

const P2_TESTS = [
  'AioiWorkerGovernanceAudit.test.js',
  'AioiQueueOperationsAudit.test.js',
  'AioiOperationalObservabilityAudit.test.js',
  'AioiOperationalHealthAudit.test.js',
  'AioiPilotGovernanceAudit.test.js'
];

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P2 — Production Operations Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P2');
  for (const doc of P2_DOCS) {
    await test(`P2-DOC: ${doc}`, () => {
      assert(readDoc(doc) && readDoc(doc).length > 200);
    });
  }

  console.log('\n  ── BLOCO B: Serviços P2');
  const services = [
    'aioiOutboxWorkerService.js',
    'aioiPilotFlags.js',
    'aioiOperationalMetricsService.js',
    'aioiOperationalHealthService.js',
    'aioiOperationalTelemetryService.js'
  ];
  for (const s of services) {
    await test(`P2-SVC: ${s}`, () => {
      assert(readSrc(`services/aioi/${s}`));
    });
  }

  console.log('\n  ── BLOCO C: Testes P2');
  for (const t of P2_TESTS) {
    await test(`P2-TEST: ${t}`, () => {
      assert(fs.existsSync(path.join(__dirname, t)));
    });
  }

  console.log('\n  ── BLOCO D: P1 + ORG preservados');
  await test('P2-P1: P1 certification report intacto', () => {
    const d = readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md');
    assert(d.includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS'));
  });

  console.log('\n  ── BLOCO E: Invariantes runtime');
  await test('P2-INV: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      const c = fs.readFileSync(fp, 'utf8');
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(c));
    }
  });

  console.log('\n  ── BLOCO F: Proibições');
  await test('P2-FORBID: sem LLM/rerank/weight_versions nos serviços P2', () => {
    const files = [
      'aioiOutboxWorkerService.js',
      'aioiOperationalMetricsService.js',
      'aioiOperationalHealthService.js'
    ];
    for (const f of files) {
      const c = stripComments(readSrc(`services/aioi/${f}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('rerank'));
      assert(!c.includes('weight_version'));
    }
  });

  console.log('\n  ── BLOCO G: Server boot gated');
  await test('P2-BOOT: worker boot condicionado a flag', () => {
    const c = readSrc('server.js');
    assert(c.includes('AIOI_OUTBOX_WORKER_BOOT'));
    assert(c.includes('IMPETUS_AIOI_OUTBOX_WORKER_ENABLED'));
  });

  console.log('\n  ── BLOCO H: Tokens certificação');
  await test('P2-TOKEN: relatório contém AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_PASS', () => {
    const d = readDoc('AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_REPORT.md');
    assert(d.includes('AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_PASS'));
    assert(d.includes('WORKER_GOVERNANCE_CERTIFIED'));
    assert(d.includes('QUEUE_OPERATIONS_CERTIFIED'));
    assert(d.includes('OPERATIONAL_OBSERVABILITY_CERTIFIED'));
    assert(d.includes('HEALTH_MONITORING_CERTIFIED'));
    assert(d.includes('PILOT_GOVERNANCE_CERTIFIED'));
    assert(d.includes('PRODUCTION_AUDIT_READY'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
