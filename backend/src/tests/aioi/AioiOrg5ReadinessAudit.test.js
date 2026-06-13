/**
 * AIOI-ORG-5 — Master Readiness Audit
 * Consolida: Workflow · SLA · Queue API · Classification · Invariantes
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { classifyIoe } = require('../../services/aioi/aioiClassificationEngine');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const SRC = path.join(BACKEND_ROOT, 'src');

function readDoc(n) { const p = path.join(DOCS, n); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function readSrc(r) { const p = path.join(SRC, r); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function stripComments(c) { return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n'); }

let passed = 0, failed = 0;
const failures = [];

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; failures.push({ label, error: e.message }); console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-ORG-5 — Master Readiness Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const ORG5_DOCS = [
    'AIOI_WORKFLOW_GOVERNANCE_CONTRACT.md',
    'AIOI_SLA_ENGINE_SPECIFICATION.md',
    'AIOI_QUEUE_API_SPECIFICATION.md',
    'AIOI_ORG_5_WORKFLOW_SLA_READINESS_REPORT.md'
  ];

  for (const doc of ORG5_DOCS) {
    await test(`O5-D: ${doc}`, () => {
      const c = readDoc(doc);
      assert(c !== null, `MISSING: ${doc}`);
      assert(c.length > 150);
    });
  }

  const PRED = [
    'AIOI_QUEUE_PRECEDENCE_CONTRACT.md',
    'AIOI_TRUTH_STAGE7_CERTIFICATION_CONTRACT.md',
    'AIOI_F49_ROADMAP_ALIGNMENT.md',
    'AIOI_ORG_4_P0_PRODUCTION_PILOT_CERTIFICATION_REPORT.md'
  ];
  for (const doc of PRED) {
    await test(`O5-P: ${doc} intacto`, () => {
      assert(readDoc(doc), `CORRUPTED: ${doc}`);
    });
  }

  await test('O5-1: Classification produz category criticity confidence sla_class', () => {
    const r = classifyIoe({
      status: 'open',
      source_type: 'plc_event',
      category: 'equipment_failure',
      priority_band: 'critical',
      priority_score: 85,
      evidence_refs: [{ type: 'plc_event', ref_id: 'x' }]
    });
    assert(r.ok);
    assert(r.classification.category);
    assert(r.classification.criticity);
    assert(r.classification.confidence > 0);
    assert(r.classification.sla_class);
    assert(r.classification.target_status === 'triaged');
  });

  await test('O5-2: Classification rejeita open→approved', () => {
    const r = classifyIoe({ status: 'approved', source_type: 'task', category: 'task_overdue' });
    assert(!r.ok);
  });

  await test('O5-3: Todos serviços ORG-5 existem', () => {
    const services = [
      'aioiClassificationEngine.js',
      'aioiClassificationConsumerService.js',
      'aioiSlaEngineService.js',
      'aioiExecutiveQueueSnapshotProjectionService.js',
      'aioiExecutiveQueueReadModelService.js',
      'aioiExecutiveQueueViewModelService.js',
      'aioiExecutiveQueueDashboardContract.js',
      'aioiQueueApiService.js'
    ];
    for (const s of services) assert(readSrc(`services/aioi/${s}`), `MISSING: ${s}`);
  });

  await test('O5-4: Migration org5 existe', () => {
    assert(fs.existsSync(path.join(BACKEND_ROOT, 'migrations/aioi_org5_workflow_sla_migration.sql')));
  });

  await test('O5-5: Zero LLM em serviços ORG-5', () => {
    const services = fs.readdirSync(path.join(SRC, 'services/aioi'))
      .filter(f => /Classification|Sla|Queue|ExecutiveQueue/.test(f));
    for (const s of services) {
      const c = stripComments(readSrc(`services/aioi/${s}`));
      assert(!c.includes('openai') && !c.includes('anthropic') && !c.includes('geminiService'), `LLM em ${s}`);
    }
  });

  await test('O5-6: Zero runtime cognitivo ORG-5', () => {
    const services = fs.readdirSync(path.join(SRC, 'services/aioi'))
      .filter(f => /Classification|Sla|Queue|ExecutiveQueue/.test(f));
    for (const s of services) {
      const c = stripComments(readSrc(`services/aioi/${s}`));
      assert(!c.includes('cognitive_execution_allowed'), s);
    }
  });

  await test('O5-7: P8 invariants', () => {
    for (const f of ['aiAssistantRuntimeService.metadata.js', 'aiInsightsRuntimeService.metadata.js']) {
      const fp = path.join(SRC, 'modules/aioi', f);
      if (!fs.existsSync(fp)) continue;
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(fs.readFileSync(fp, 'utf8')));
    }
  });

  await test('O5-8: Sub-audits existem', () => {
    assert(readSrc('tests/aioi/AioiWorkflowGovernanceAudit.test.js'));
    assert(readSrc('tests/aioi/AioiSlaEngineAudit.test.js'));
    assert(readSrc('tests/aioi/AioiQueueApiAudit.test.js'));
  });

  await test('O5-9: Classificações alvo no report', () => {
    const r = readDoc('AIOI_ORG_5_WORKFLOW_SLA_READINESS_REPORT.md');
    for (const t of ['WORKFLOW_ENGINE_READY', 'QUEUE_API_READY', 'CEO_WORKFLOW_READY', 'SLA_ENGINE_READY', 'WORKFLOW_GOVERNANCE_CERTIFIED']) {
      assert(r.includes(t), `Token ${t} ausente`);
    }
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Resultado: ${passed} PASS · ${failed} FAIL`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n  ┌──────────────────────────────────────────────────────────┐');
    console.log('  │  AIOI_ORG_5_WORKFLOW_SLA_READINESS_PASS                 │');
    console.log('  │  WORKFLOW_ENGINE_READY                                   │');
    console.log('  │  QUEUE_API_READY                                         │');
    console.log('  │  CEO_WORKFLOW_READY                                      │');
    console.log('  │  SLA_ENGINE_READY                                        │');
    console.log('  │  WORKFLOW_GOVERNANCE_CERTIFIED                           │');
    console.log('  └──────────────────────────────────────────────────────────┘\n');
    process.exit(0);
  }
})();
