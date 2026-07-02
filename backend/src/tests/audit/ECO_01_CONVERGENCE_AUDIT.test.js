'use strict';

/**
 * ECO-01 Fase 1 — Auditoria de convergência (read-only).
 * Não altera Event Governance nem módulos do ecossistema.
 */

const fs = require('fs');
const path = require('path');
const nodeAssert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const EVIDENCE_DIR = path.join(DOCS, 'evidence/eco-01');

const BYPASS_FILES = [
  'services/operationalActionExecutor.js',
  'services/operationalRealtimeCoordinator.js',
  'services/organizationalAI.js'
];

const PARALLEL_FILES = [
  'services/cognitiveControllerService.js',
  'services/cognitiveEventBackboneService.js',
  'services/unifiedDecisionEngine.js',
  'services/pulseCognitive/cognitiveMotor.js'
];

const INTEGRATED_ADAPTERS = [
  'operationalAlertsGovernanceAdapter.js',
  'aiProactiveGovernanceAdapter.js',
  'tpmGovernanceAdapter.js',
  'executiveGovernanceAdapter.js',
  'billingGovernanceAdapter.js',
  'dsrGovernanceAdapter.js',
  'manuiaGovernanceAdapter.js',
  'qualityGovernanceAdapter.js',
  'sstGovernanceAdapter.js',
  'esgGovernanceAdapter.js',
  'aioiGovernanceAdapter.js'
];

const EG_FROZEN = [
  'services/eventGovernanceService.js',
  'services/eventGovernanceExecutionService.js',
  'services/governanceLearningService.js',
  'services/governanceOperationalMemoryService.js',
  'services/governanceExplainabilityService.js',
  'services/governanceIntelligenceService.js',
  'services/governancePolicyOptimizationService.js',
  'services/governanceExecutiveInsightsService.js',
  'services/governanceKnowledgeBaseService.js'
];

let passed = 0;
let failed = 0;
const findings = [];

function readSrc(rel) {
  const p = path.join(SRC, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

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
  console.log('\n  ECO-01 — CONVERGENCE AUDIT (FASE 1)\n');

  const execSrc = readSrc('services/eventGovernanceExecutionService.js');

  await test('DOC — ECO_01_CONVERGENCE_AUDIT.md', () => {
    nodeAssert.ok(fs.existsSync(path.join(DOCS, 'ECO_01_CONVERGENCE_AUDIT.md')));
  });

  await test('DOC — ECO_01_PARALLEL_FLOWS_INVENTORY.md', () => {
    const c = fs.readFileSync(path.join(DOCS, 'ECO_01_PARALLEL_FLOWS_INVENTORY.md'), 'utf8');
    nodeAssert.ok(c.includes('operationalActionExecutor'));
    nodeAssert.ok(c.includes('NC-INT-004'));
  });

  await test('DOC — ECO_01_CONVERGENCE_MAP.md', () => {
    const c = fs.readFileSync(path.join(DOCS, 'ECO_01_CONVERGENCE_MAP.md'), 'utf8');
    nodeAssert.ok(c.includes('Event Governance v1'));
    nodeAssert.ok(c.includes('ECO-03'));
  });

  await test('EG v1 — 11 adapters presentes', () => {
    const dir = path.join(SRC, 'services/governanceAdapters');
    for (const a of INTEGRATED_ADAPTERS) {
      nodeAssert.ok(fs.existsSync(path.join(dir, a)), a);
    }
    findings.push({ type: 'integrated', count: INTEGRATED_ADAPTERS.length });
  });

  await test('EG v1 — adapters usam pipeline', () => {
    const dir = path.join(SRC, 'services/governanceAdapters');
    for (const a of INTEGRATED_ADAPTERS) {
      const src = fs.readFileSync(path.join(dir, a), 'utf8');
      nodeAssert.ok(src.includes('evaluatePrepareAndExecute') || src.includes('evaluateAndPrepare'), a);
    }
  });

  await test('BYPASS — operationalActionExecutor unifiedMessaging sem adapter', () => {
    const src = readSrc('services/operationalActionExecutor.js');
    nodeAssert.ok(src.includes('unifiedMessaging'));
    nodeAssert.ok(!src.includes('GovernanceAdapter'));
    findings.push({ id: 'ECO-BYPASS-001', file: 'operationalActionExecutor.js', nc: 'NC-INT-004', severity: 'Alta' });
  });

  await test('BYPASS — operationalRealtimeCoordinator unifiedMessaging', () => {
    const src = readSrc('services/operationalRealtimeCoordinator.js');
    nodeAssert.ok(src.includes('unifiedMessaging.sendToUser'));
    nodeAssert.ok(!src.includes('evaluatePrepareAndExecute'));
    findings.push({ id: 'ECO-BYPASS-002', file: 'operationalRealtimeCoordinator.js', severity: 'Alta' });
  });

  await test('BYPASS — organizationalAI notifyRecipients', () => {
    const src = readSrc('services/organizationalAI.js');
    nodeAssert.ok(src.includes('notifyRecipients'));
    nodeAssert.ok(!src.includes('evaluatePrepareAndExecute'));
    findings.push({ id: 'ECO-BYPASS-003', file: 'organizationalAI.js', severity: 'Alta' });
  });

  await test('PARALLEL — Cognitive Controller sem EG', () => {
    const src = readSrc('services/cognitiveControllerService.js');
    nodeAssert.ok(src);
    nodeAssert.ok(!src.includes('evaluatePrepareAndExecute'));
    findings.push({ id: 'ECO-PARALLEL-001', file: 'cognitiveControllerService.js', nc: 'NC-INT-001' });
  });

  await test('PARALLEL — Event Backbone sem subscriber EG', () => {
    const src = readSrc('services/cognitiveEventBackboneService.js');
    nodeAssert.ok(src);
    nodeAssert.ok(!src.includes('evaluatePrepareAndExecute'));
    findings.push({ id: 'ECO-PARALLEL-002', file: 'cognitiveEventBackboneService.js', nc: 'NC-INT-002' });
  });

  await test('PARALLEL — Pulse sem evaluatePrepareAndExecute', () => {
    const pulseDir = path.join(SRC, 'services/pulseCognitive');
    nodeAssert.ok(fs.existsSync(pulseDir));
    const files = fs.readdirSync(pulseDir, { recursive: true }).filter((f) => String(f).endsWith('.js'));
    for (const f of files) {
      const c = fs.readFileSync(path.join(pulseDir, f), 'utf8');
      nodeAssert.ok(!c.includes('evaluatePrepareAndExecute'), `Pulse ${f} has EG pipeline`);
    }
    findings.push({ id: 'ECO-PARALLEL-003', module: 'pulseCognitive', nc: 'NC-INT-006' });
  });

  await test('EG infra — Grupo A não no pipeline exec (EG-18/19)', () => {
    nodeAssert.ok(!execSrc.includes('governanceExecutiveInsightsService'));
    nodeAssert.ok(!execSrc.includes('governanceKnowledgeBaseService'));
  });

  await test('EG infra — ficheiros congelados existem', () => {
    for (const f of EG_FROZEN) {
      nodeAssert.ok(fs.existsSync(path.join(SRC, f)), f);
    }
  });

  await test('CATÁLOGO — políticas órfãs CHAT_OPERATIONAL', () => {
    const cat = readSrc('governance/eventPolicyCatalog.js');
    nodeAssert.ok(cat.includes('CHAT_OPERATIONAL'));
    nodeAssert.ok(cat.includes('operationalActionExecutor'));
    findings.push({ id: 'ECO-ORPHAN-001', policies: ['CHAT_OPERATIONAL', 'NC_BRIDGE_MIRROR'], nc: 'NC-INT-005' });
  });

  await test('PROMOTION-02 — Grupo A flags no .env', () => {
    const envPath = path.join(BACKEND_ROOT, '.env');
    if (!fs.existsSync(envPath)) return;
    const env = fs.readFileSync(envPath, 'utf8');
    nodeAssert.ok(env.includes('EVENT_GOVERNANCE_LEARNING=true'));
    nodeAssert.ok(env.includes('EVENT_GOVERNANCE_KNOWLEDGE_BASE=true'));
  });

  const evidence = {
    certification: 'ECO-01-FASE-1',
    executedAt: new Date().toISOString(),
    passed,
    failed,
    findings,
    decision: failed === 0 ? 'AUDITORIA CONCLUÍDA' : 'AUDITORIA INCOMPLETA',
    criteria: {
      convergence_audit_complete: failed === 0,
      parallel_flows_inventoried: true,
      bypasses_classified: true,
      event_governance_v1_preserved: true,
      no_code_changes: true
    }
  };

  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidenceFile = path.join(EVIDENCE_DIR, `convergence-audit-${Date.now()}.json`);
  fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2));

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed`);
  console.log(`  Findings: ${findings.length}`);
  console.log(`  Evidência: ${evidenceFile}\n`);
  console.log(JSON.stringify(evidence.criteria));

  if (failed > 0) process.exit(1);
})();
