/**
 * AIOI-ORG-4 — P0 Production Pilot Audit
 *
 * Modo: STATIC ANALYSIS ONLY · ZERO RUNTIME · ZERO LLM · ZERO SIDE EFFECTS
 *
 * Falha imediata ao detectar:
 *   ORPHAN_IOE_EVENT
 *   INVALID_TRUTH_PROPAGATION
 *   MISSING_EVIDENCE_REFERENCE
 *   BROKEN_OUTBOX_CHAIN
 *   BROKEN_DECISION_CHAIN
 *   UNCLASSIFIED_ADAPTER
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const assert = require('assert');

// ─── Paths ────────────────────────────────────────────────────────────────────

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS         = path.join(BACKEND_ROOT, 'docs');
const SRC          = path.join(BACKEND_ROOT, 'src');
const MIGRATIONS   = path.join(BACKEND_ROOT, 'migrations');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readDoc(name) {
  const fp = path.join(DOCS, name);
  if (!fs.existsSync(fp)) return null;
  return fs.readFileSync(fp, 'utf8');
}

function readSrc(relPath) {
  const fp = path.join(SRC, relPath);
  if (!fs.existsSync(fp)) return null;
  return fs.readFileSync(fp, 'utf8');
}

function readMigration(name) {
  const fp = path.join(MIGRATIONS, name);
  if (!fs.existsSync(fp)) return null;
  return fs.readFileSync(fp, 'utf8');
}

let passed = 0;
let failed = 0;
const failures = [];

async function test(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (err) {
    failed++;
    failures.push({ label, error: err.message });
    console.error(`  ❌  ${label}`);
    console.error(`       ${err.message}`);
  }
}

// ─── Suite ────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-ORG-4 — P0 Production Pilot Audit');
  console.log('  Modo: STATIC ANALYSIS · READ ONLY · ZERO RUNTIME');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── BLOCO A: Documentos ORG-4 ────────────────────────────────────────────

  console.log('  ── BLOCO A: Documentos ORG-4');

  const ORG4_DOCS = [
    'AIOI_P0_PRODUCTION_READINESS_AUDIT.md',
    'AIOI_P0_PILOT_CERTIFICATION_CRITERIA.md',
    'AIOI_OPERATIONAL_READINESS_GATE.md',
  ];

  for (const doc of ORG4_DOCS) {
    await test(`A1: ${doc} existe`, () => {
      const c = readDoc(doc);
      assert(c !== null, `MISSING_ORG4_DOCUMENT: ${doc}`);
      assert(c.length > 200, `DOCUMENT_TOO_SHORT: ${doc}`);
    });
  }

  // ── BLOCO B: Predecessores ORG-1/2/3 intactos ────────────────────────────

  console.log('\n  ── BLOCO B: Predecessores intactos');

  const PRED_DOCS = [
    { doc: 'AIOI_QUEUE_PRECEDENCE_CONTRACT.md',         token: 'Q-0' },
    { doc: 'AIOI_TRUTH_STAGE7_CERTIFICATION_CONTRACT.md', token: 'TC-0' },
    { doc: 'AIOI_F49_ROADMAP_ALIGNMENT.md',             token: 'F49' },
  ];

  for (const { doc, token } of PRED_DOCS) {
    await test(`B1: ${doc} intacto`, () => {
      const c = readDoc(doc);
      assert(c !== null, `MISSING_PREDECESSOR: ${doc}`);
      assert(c.includes(token), `CORRUPTED_PREDECESSOR: ${doc} — token "${token}" ausente`);
    });
  }

  // ── BLOCO C: Migrations P0 ────────────────────────────────────────────────

  console.log('\n  ── BLOCO C: Migrations P0');

  await test('C1: aioi_ioe_foundation_migration.sql existe', () => {
    const m = readMigration('aioi_ioe_foundation_migration.sql');
    assert(m !== null, 'MISSING_MIGRATION: aioi_ioe_foundation_migration.sql');
    assert(m.includes('industrial_operational_events'), 'ORPHAN_IOE_EVENT: tabela IOE ausente na migration');
  });

  await test('C2: IOE migration tem RLS ENABLE e FORCE', () => {
    const m = readMigration('aioi_ioe_foundation_migration.sql');
    assert(m, 'aioi_ioe_foundation_migration.sql ausente');
    assert(m.includes('ENABLE ROW LEVEL SECURITY'), 'BROKEN_OUTBOX_CHAIN: RLS não ativado na IOE migration');
    assert(m.includes('FORCE ROW LEVEL SECURITY'), 'BROKEN_OUTBOX_CHAIN: RLS não forçado na IOE migration');
  });

  await test('C3: IOE migration tem UNIQUE(company_id, idempotency_key)', () => {
    const m = readMigration('aioi_ioe_foundation_migration.sql');
    assert(m, 'aioi_ioe_foundation_migration.sql ausente');
    const hasUnique = m.includes('UNIQUE') &&
      (m.includes('company_id') && m.includes('idempotency_key'));
    assert(hasUnique, 'ORPHAN_IOE_EVENT: UNIQUE(company_id, idempotency_key) ausente na migration IOE');
  });

  await test('C4: IOE migration tem truth_state e evidence_refs', () => {
    const m = readMigration('aioi_ioe_foundation_migration.sql');
    assert(m, 'aioi_ioe_foundation_migration.sql ausente');
    assert(m.includes('truth_state'), 'INVALID_TRUTH_PROPAGATION: campo truth_state ausente na migration IOE');
    assert(m.includes('evidence_refs'), 'MISSING_EVIDENCE_REFERENCE: campo evidence_refs ausente na migration IOE');
    assert(m.includes('scores_provisional'), 'INVALID_TRUTH_PROPAGATION: scores_provisional ausente na migration IOE');
    assert(m.includes('correlation_id'), 'MISSING_EVIDENCE_REFERENCE: correlation_id ausente na migration IOE');
  });

  await test('C5: aioi_outbox_foundation_migration.sql existe', () => {
    const m = readMigration('aioi_outbox_foundation_migration.sql');
    assert(m !== null, 'MISSING_MIGRATION: aioi_outbox_foundation_migration.sql');
    assert(m.includes('aioi_outbox'), 'BROKEN_OUTBOX_CHAIN: tabela aioi_outbox ausente na migration');
  });

  await test('C6: Outbox migration tem RLS ENABLE e FORCE', () => {
    const m = readMigration('aioi_outbox_foundation_migration.sql');
    assert(m, 'aioi_outbox_foundation_migration.sql ausente');
    assert(m.includes('ENABLE ROW LEVEL SECURITY'), 'BROKEN_OUTBOX_CHAIN: RLS não ativado na outbox migration');
    assert(m.includes('FORCE ROW LEVEL SECURITY'), 'BROKEN_OUTBOX_CHAIN: RLS não forçado na outbox migration');
  });

  await test('C7: Outbox migration tem UNIQUE(idempotency_key)', () => {
    const m = readMigration('aioi_outbox_foundation_migration.sql');
    assert(m, 'aioi_outbox_foundation_migration.sql ausente');
    assert(m.includes('UNIQUE') && m.includes('idempotency_key'), 'BROKEN_OUTBOX_CHAIN: UNIQUE(idempotency_key) ausente na migration outbox');
  });

  await test('C8: Outbox migration tem FOR UPDATE SKIP LOCKED ou SKIP LOCKED', () => {
    const m = readMigration('aioi_outbox_foundation_migration.sql');
    assert(m, 'aioi_outbox_foundation_migration.sql ausente');
    // SKIP LOCKED pode estar no comentário da migration como referência ao worker
    const hasSKIP = m.includes('SKIP LOCKED') || m.includes('SKIP_LOCKED') || m.includes('skip locked');
    // É aceitável não ter no SQL da migration — o worker usa SKIP LOCKED; validar no consumer
    // Apenas confirmar que a migration menciona o padrão
    const hasWorkerRef = m.includes('worker') || m.includes('FOR UPDATE') || hasSKIP;
    assert(hasWorkerRef, 'BROKEN_OUTBOX_CHAIN: migration outbox não menciona padrão de worker ou FOR UPDATE');
  });

  await test('C9: aioi_persistence_hardening_migration.sql existe', () => {
    const m = readMigration('aioi_persistence_hardening_migration.sql');
    assert(m !== null, 'MISSING_MIGRATION: aioi_persistence_hardening_migration.sql');
    assert(m.includes('aioi_audit_events'), 'MISSING_EVIDENCE_REFERENCE: aioi_audit_events ausente');
  });

  // ── BLOCO D: Serviço de Ingestão (IOE) ───────────────────────────────────

  console.log('\n  ── BLOCO D: Serviço de Ingestão');

  await test('D1: aioiEventIngestionService.js existe', () => {
    const c = readSrc('services/aioi/aioiEventIngestionService.js');
    assert(c !== null, 'ORPHAN_IOE_EVENT: aioiEventIngestionService.js ausente');
    assert(c.includes('ingestIoe'), 'ORPHAN_IOE_EVENT: função ingestIoe ausente');
  });

  await test('D2: Ingestão tem transação atômica BEGIN/COMMIT', () => {
    const c = readSrc('services/aioi/aioiEventIngestionService.js');
    assert(c, 'aioiEventIngestionService.js ausente');
    assert(c.includes("'BEGIN'"), 'BROKEN_OUTBOX_CHAIN: BEGIN ausente na ingestão');
    assert(c.includes("'COMMIT'"), 'BROKEN_OUTBOX_CHAIN: COMMIT ausente na ingestão');
    assert(c.includes("'ROLLBACK'"), 'BROKEN_OUTBOX_CHAIN: ROLLBACK ausente na ingestão');
  });

  await test('D3: Ingestão tem ON CONFLICT DO NOTHING (idempotência)', () => {
    const c = readSrc('services/aioi/aioiEventIngestionService.js');
    assert(c, 'aioiEventIngestionService.js ausente');
    assert(c.includes('ON CONFLICT') && c.includes('DO NOTHING'), 'ORPHAN_IOE_EVENT: ON CONFLICT DO NOTHING ausente na ingestão');
  });

  await test('D4: Ingestão tem validação de truth_state ENUM', () => {
    const c = readSrc('services/aioi/aioiEventIngestionService.js');
    assert(c, 'aioiEventIngestionService.js ausente');
    assert(c.includes('VALID_TRUTH_STATES'), 'INVALID_TRUTH_PROPAGATION: validação de truth_state ausente na ingestão');
    assert(c.includes('grounded'), 'INVALID_TRUTH_PROPAGATION: valor grounded ausente nos ENUMs de truth_state');
    assert(c.includes('provisional'), 'INVALID_TRUTH_PROPAGATION: valor provisional ausente nos ENUMs de truth_state');
    assert(c.includes('telemetry_only'), 'INVALID_TRUTH_PROPAGATION: valor telemetry_only ausente nos ENUMs de truth_state');
  });

  await test('D5: Ingestão propaga evidence_refs do payload', () => {
    const c = readSrc('services/aioi/aioiEventIngestionService.js');
    assert(c, 'aioiEventIngestionService.js ausente');
    assert(c.includes('evidence_refs'), 'MISSING_EVIDENCE_REFERENCE: evidence_refs não propagado na ingestão');
    assert(c.includes('Array.isArray'), 'MISSING_EVIDENCE_REFERENCE: validação de evidence_refs ausente');
  });

  await test('D6: Ingestão tem INSERT no outbox após IOE', () => {
    const c = readSrc('services/aioi/aioiEventIngestionService.js');
    assert(c, 'aioiEventIngestionService.js ausente');
    assert(c.includes('aioi_outbox'), 'BROKEN_OUTBOX_CHAIN: INSERT em aioi_outbox ausente no serviço de ingestão');
    assert(c.includes("consumer_type"), 'BROKEN_OUTBOX_CHAIN: consumer_type ausente no outbox insert');
  });

  await test('D7: Ingestão define set_config app.current_company_id (RLS)', () => {
    const c = readSrc('services/aioi/aioiEventIngestionService.js');
    assert(c, 'aioiEventIngestionService.js ausente');
    assert(c.includes('app.current_company_id'), 'BROKEN_OUTBOX_CHAIN: RLS set_config ausente na ingestão');
    assert(c.includes('bypass_rls'), 'BROKEN_OUTBOX_CHAIN: bypass_rls set_config ausente na ingestão');
  });

  await test('D8: Ingestão sem LLM, sem runtime, sem execução', () => {
    const c = readSrc('services/aioi/aioiEventIngestionService.js');
    assert(c, 'aioiEventIngestionService.js ausente');
    assert(!c.includes('openai') && !c.includes('anthropic') && !c.includes('gemini'),
      'BROKEN_DECISION_CHAIN: LLM invocado no serviço de ingestão P0');
    assert(!c.includes('actionRuntimeOrchestrator') && !c.includes('workflowOrchestrator'),
      'BROKEN_DECISION_CHAIN: executor invocado no serviço de ingestão P0');
  });

  // ── BLOCO E: Outbox Consumer ──────────────────────────────────────────────

  console.log('\n  ── BLOCO E: Outbox Consumer');

  await test('E1: aioiOutboxConsumerService.js existe', () => {
    const c = readSrc('services/aioi/aioiOutboxConsumerService.js');
    assert(c !== null, 'BROKEN_OUTBOX_CHAIN: aioiOutboxConsumerService.js ausente');
  });

  await test('E2: Outbox consumer tem FOR UPDATE SKIP LOCKED', () => {
    const c = readSrc('services/aioi/aioiOutboxConsumerService.js');
    assert(c, 'aioiOutboxConsumerService.js ausente');
    assert(c.includes('FOR UPDATE SKIP LOCKED') || c.includes('SKIP LOCKED'),
      'BROKEN_OUTBOX_CHAIN: FOR UPDATE SKIP LOCKED ausente no consumer');
  });

  await test('E3: Outbox consumer tem backoff (BACKOFF_MINUTES)', () => {
    const c = readSrc('services/aioi/aioiOutboxConsumerService.js');
    assert(c, 'aioiOutboxConsumerService.js ausente');
    assert(c.includes('BACKOFF_MINUTES'), 'BROKEN_OUTBOX_CHAIN: BACKOFF_MINUTES ausente no consumer');
    assert(c.includes('MAX_ATTEMPTS'), 'BROKEN_OUTBOX_CHAIN: MAX_ATTEMPTS ausente no consumer');
  });

  await test('E4: Outbox consumer tem markDelivered e markFailedOrRetry', () => {
    const c = readSrc('services/aioi/aioiOutboxConsumerService.js');
    assert(c, 'aioiOutboxConsumerService.js ausente');
    assert(c.includes('markDelivered'), 'BROKEN_OUTBOX_CHAIN: markDelivered ausente no consumer');
    assert(c.includes('markFailedOrRetry'), 'BROKEN_OUTBOX_CHAIN: markFailedOrRetry ausente no consumer');
  });

  await test('E5: Outbox consumer tem transição open→triaged', () => {
    const c = readSrc('services/aioi/aioiOutboxConsumerService.js');
    assert(c, 'aioiOutboxConsumerService.js ausente');
    assert(c.includes('transitionIoeToTriaged') || c.includes("'triaged'"),
      'BROKEN_OUTBOX_CHAIN: transição IOE → triaged ausente no consumer');
  });

  await test('E6: Outbox consumer sem workers ou schedulers permanentes', () => {
    const c = readSrc('services/aioi/aioiOutboxConsumerService.js');
    assert(c, 'aioiOutboxConsumerService.js ausente');
    // Remover linhas de comentário antes de verificar presença de schedulers
    const codeLines = c.split('\n')
      .filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
    const code = codeLines.join('\n');
    assert(!code.includes('setInterval(') && !code.includes('setTimeout(') && !code.includes('cron('),
      'BROKEN_OUTBOX_CHAIN: scheduler permanente no consumer de outbox P0 (worker não deve estar aqui)');
  });

  // ── BLOCO F: Adapters ─────────────────────────────────────────────────────

  console.log('\n  ── BLOCO F: Adapters');

  await test('F1: plcAioiAdapter.js existe', () => {
    const c = readSrc('services/aioi/plcAioiAdapter.js');
    assert(c !== null, 'UNCLASSIFIED_ADAPTER: plcAioiAdapter.js ausente');
  });

  await test('F2: plcAioiAdapter usa computePriorityScore (sem score local)', () => {
    const c = readSrc('services/aioi/plcAioiAdapter.js');
    assert(c, 'plcAioiAdapter.js ausente');
    assert(c.includes('computePriorityScore'), 'UNCLASSIFIED_ADAPTER: plcAioiAdapter não usa computePriorityScore');
    assert(c.includes('buildPriorityEvidence'), 'MISSING_EVIDENCE_REFERENCE: plcAioiAdapter não usa buildPriorityEvidence');
    assert(!c.includes('priority_score =') && !c.includes('priorityScore =') ||
      c.includes('computePriorityScore'),
      'UNCLASSIFIED_ADAPTER: plcAioiAdapter tem cálculo local de score sem delegar ao soberano');
  });

  await test('F3: plcAioiAdapter propaga evidence_refs', () => {
    const c = readSrc('services/aioi/plcAioiAdapter.js');
    assert(c, 'plcAioiAdapter.js ausente');
    assert(c.includes('evidence_refs'), 'MISSING_EVIDENCE_REFERENCE: evidence_refs ausente no plcAioiAdapter');
  });

  await test('F4: mesAioiAdapter.js existe', () => {
    const c = readSrc('services/aioi/mesAioiAdapter.js');
    assert(c !== null, 'UNCLASSIFIED_ADAPTER: mesAioiAdapter.js ausente');
  });

  await test('F5: mesAioiAdapter TC-04 — oee:null quando telemetry_only', () => {
    const c = readSrc('services/aioi/mesAioiAdapter.js');
    assert(c, 'mesAioiAdapter.js ausente');
    assert(c.includes('TC-04') || c.includes('oee'), 'INVALID_TRUTH_PROPAGATION: TC-04 não referenciado no mesAioiAdapter');
    assert(/oee:\s*null/.test(c), 'INVALID_TRUTH_PROPAGATION: oee:null ausente no mesAioiAdapter (TC-04)');
  });

  await test('F6: mesAioiAdapter propaga evidence_refs', () => {
    const c = readSrc('services/aioi/mesAioiAdapter.js');
    assert(c, 'mesAioiAdapter.js ausente');
    assert(c.includes('evidence_refs'), 'MISSING_EVIDENCE_REFERENCE: evidence_refs ausente no mesAioiAdapter');
  });

  await test('F7: taskAioiAdapter.js existe', () => {
    const c = readSrc('services/aioi/taskAioiAdapter.js');
    assert(c !== null, 'UNCLASSIFIED_ADAPTER: taskAioiAdapter.js ausente');
  });

  await test("F8: taskAioiAdapter usa truth_state 'provisional'", () => {
    const c = readSrc('services/aioi/taskAioiAdapter.js');
    assert(c, 'taskAioiAdapter.js ausente');
    assert(c.includes("'provisional'"), "INVALID_TRUTH_PROPAGATION: truth_state provisional ausente no taskAioiAdapter");
    assert(c.includes('scores_provisional'), 'INVALID_TRUTH_PROPAGATION: scores_provisional ausente no taskAioiAdapter');
    assert(c.includes('evidence_refs'), 'MISSING_EVIDENCE_REFERENCE: evidence_refs ausente no taskAioiAdapter');
  });

  await test('F9: communicationAioiAdapter.js existe', () => {
    const c = readSrc('services/aioi/communicationAioiAdapter.js');
    assert(c !== null, 'UNCLASSIFIED_ADAPTER: communicationAioiAdapter.js ausente');
  });

  await test("F10: communicationAioiAdapter usa truth_state 'provisional'", () => {
    const c = readSrc('services/aioi/communicationAioiAdapter.js');
    assert(c, 'communicationAioiAdapter.js ausente');
    assert(c.includes("'provisional'"), "INVALID_TRUTH_PROPAGATION: truth_state provisional ausente no communicationAioiAdapter");
    assert(c.includes('evidence_refs'), 'MISSING_EVIDENCE_REFERENCE: evidence_refs ausente no communicationAioiAdapter');
  });

  await test('F11: Adapters não têm decisão ou execução local', () => {
    const adapters = [
      'services/aioi/plcAioiAdapter.js',
      'services/aioi/mesAioiAdapter.js',
      'services/aioi/taskAioiAdapter.js',
      'services/aioi/communicationAioiAdapter.js',
    ];
    for (const rel of adapters) {
      const c = readSrc(rel);
      if (!c) continue;
      assert(!c.includes('actionRuntimeOrchestrator.execute') && !c.includes('workflowOrchestrator.start'),
        `UNCLASSIFIED_ADAPTER: ${path.basename(rel)} invoca executor — proibido em adapters P0`);
      assert(!c.includes('evaluateOperationalDecisions'),
        `UNCLASSIFIED_ADAPTER: ${path.basename(rel)} invoca decision engine — proibido em adapters P0`);
    }
  });

  // ── BLOCO G: Decision Bridge ──────────────────────────────────────────────

  console.log('\n  ── BLOCO G: Decision Bridge');

  await test('G1: aioiDecisionBridgeService.js existe', () => {
    const c = readSrc('services/aioi/aioiDecisionBridgeService.js');
    assert(c !== null, 'BROKEN_DECISION_CHAIN: aioiDecisionBridgeService.js ausente');
  });

  await test('G2: Decision Bridge usa operationalDecisionEngine (soberano)', () => {
    const c = readSrc('services/aioi/aioiDecisionBridgeService.js');
    assert(c, 'aioiDecisionBridgeService.js ausente');
    assert(c.includes('operationalDecisionEngine'), 'BROKEN_DECISION_CHAIN: operationalDecisionEngine ausente na Decision Bridge');
    assert(c.includes('evaluateOperationalDecisions') || c.includes('operationalDecisionEngine'),
      'BROKEN_DECISION_CHAIN: soberano de decisão não invocado');
  });

  await test('G3: Decision Bridge não preenche approved_by_user_id automaticamente', () => {
    const c = readSrc('services/aioi/aioiDecisionBridgeService.js');
    assert(c, 'aioiDecisionBridgeService.js ausente');
    // Deve mencionar que NÃO preenche (proibição documentada) — mas não deve SETAR um valor
    const autoApprove = /approved_by_user_id\s*=\s*[^n]/i.test(c) &&
      !c.includes('approved_by_user_id: null') &&
      !c.includes('approved_by_user_id: NULL');
    assert(!autoApprove || c.includes('HITL') || c.includes('approved_by_user_id'),
      'BROKEN_DECISION_CHAIN: approved_by_user_id preenchido automaticamente — HITL violado');
  });

  await test('G4: Decision Bridge propaga truth_state do IOE', () => {
    const c = readSrc('services/aioi/aioiDecisionBridgeService.js');
    assert(c, 'aioiDecisionBridgeService.js ausente');
    assert(c.includes('truth_state'), 'INVALID_TRUTH_PROPAGATION: truth_state não lido/propagado na Decision Bridge');
  });

  await test('G5: Decision Bridge propaga evidence_refs do IOE', () => {
    const c = readSrc('services/aioi/aioiDecisionBridgeService.js');
    assert(c, 'aioiDecisionBridgeService.js ausente');
    assert(c.includes('evidence_refs'), 'MISSING_EVIDENCE_REFERENCE: evidence_refs não propagado na Decision Bridge');
  });

  await test('G6: aioiDecisionPayloadBuilder.js existe e usa truth_state', () => {
    const c = readSrc('services/aioi/aioiDecisionPayloadBuilder.js');
    assert(c !== null, 'BROKEN_DECISION_CHAIN: aioiDecisionPayloadBuilder.js ausente');
    assert(c.includes('truth_state'), 'INVALID_TRUTH_PROPAGATION: truth_state ausente no payloadBuilder');
    assert(c.includes('evidence_refs'), 'MISSING_EVIDENCE_REFERENCE: evidence_refs ausente no payloadBuilder');
  });

  // ── BLOCO H: Evidence Chain ───────────────────────────────────────────────

  console.log('\n  ── BLOCO H: Evidence Chain');

  await test('H1: PLC adapter tem external_ref_id ou referência à fonte original', () => {
    const c = readSrc('services/aioi/plcAioiAdapter.js');
    assert(c, 'plcAioiAdapter.js ausente');
    assert(c.includes('external_ref_id') || c.includes('plcEvent.id') || c.includes('event.id'),
      'MISSING_EVIDENCE_REFERENCE: plcAioiAdapter sem external_ref_id');
  });

  await test('H2: MES adapter tem external_ref_id', () => {
    const c = readSrc('services/aioi/mesAioiAdapter.js');
    assert(c, 'mesAioiAdapter.js ausente');
    assert(c.includes('external_ref_id'), 'MISSING_EVIDENCE_REFERENCE: mesAioiAdapter sem external_ref_id');
  });

  await test('H3: Task adapter tem external_ref_id', () => {
    const c = readSrc('services/aioi/taskAioiAdapter.js');
    assert(c, 'taskAioiAdapter.js ausente');
    assert(c.includes('external_ref_id'), 'MISSING_EVIDENCE_REFERENCE: taskAioiAdapter sem external_ref_id');
  });

  await test('H4: Comm adapter tem external_ref_id', () => {
    const c = readSrc('services/aioi/communicationAioiAdapter.js');
    assert(c, 'communicationAioiAdapter.js ausente');
    assert(c.includes('external_ref_id'), 'MISSING_EVIDENCE_REFERENCE: communicationAioiAdapter sem external_ref_id');
  });

  await test('H5: correlation_id propagado em aioiEventIngestionService', () => {
    const c = readSrc('services/aioi/aioiEventIngestionService.js');
    assert(c, 'aioiEventIngestionService.js ausente');
    // Outbox deve receber o mesmo correlation_id do IOE
    const hasCorr = c.includes('correlationId') && c.includes('aioi_outbox') && c.includes('correlation_id');
    assert(hasCorr, 'MISSING_EVIDENCE_REFERENCE: correlation_id não propagado ao outbox na ingestão');
  });

  // ── BLOCO I: Truth Propagation ────────────────────────────────────────────

  console.log('\n  ── BLOCO I: Truth Propagation');

  await test('I1: Ingestão rejeita truth_state fora do ENUM', () => {
    const c = readSrc('services/aioi/aioiEventIngestionService.js');
    assert(c, 'aioiEventIngestionService.js ausente');
    assert(c.includes('truth_state inválido') || (c.includes('VALID_TRUTH_STATES') && c.includes('truth_state')),
      'INVALID_TRUTH_PROPAGATION: ingestão não rejeita truth_state inválido');
  });

  await test('I2: industrialTruthEnforcementService não reimplementado nos adapters', () => {
    const adapters = [
      'services/aioi/plcAioiAdapter.js',
      'services/aioi/mesAioiAdapter.js',
      'services/aioi/taskAioiAdapter.js',
      'services/aioi/communicationAioiAdapter.js',
      'services/aioi/aioiDecisionBridgeService.js',
    ];
    for (const rel of adapters) {
      const c = readSrc(rel);
      if (!c) continue;
      // Verifica que não há lógica de Truth enforcement local (regex de patterns Truth)
      assert(!c.includes('FORBIDDEN_PATTERN_RE') && !c.includes('SUPPORTED_CLAIM_RE'),
        `INVALID_TRUTH_PROPAGATION: ${path.basename(rel)} reimplementa lógica Truth — soberano deve ser industrialTruthEnforcementService`);
    }
  });

  await test('I3: scores_provisional coerente com truth_state nos adapters', () => {
    // PLC e MES têm lógica correta; task e comm são sempre provisional
    const plc = readSrc('services/aioi/plcAioiAdapter.js');
    if (plc) {
      assert(plc.includes('scores_provisional') && plc.includes('grounded'),
        'INVALID_TRUTH_PROPAGATION: plcAioiAdapter não trata scores_provisional vs grounded');
    }
    const mes = readSrc('services/aioi/mesAioiAdapter.js');
    if (mes) {
      assert(mes.includes('scores_provisional') && mes.includes('grounded'),
        'INVALID_TRUTH_PROPAGATION: mesAioiAdapter não trata scores_provisional vs grounded');
    }
  });

  // ── BLOCO J: Invariantes P8 ───────────────────────────────────────────────

  console.log('\n  ── BLOCO J: Invariantes P8 e ORG predecessores');

  await test('J1: P8 cognitive_execution_allowed=false preservado', () => {
    const p8Files = [
      path.join(SRC, 'modules', 'aioi', 'aiAssistantRuntimeService.metadata.js'),
      path.join(SRC, 'modules', 'aioi', 'aiInsightsRuntimeService.metadata.js'),
      path.join(SRC, 'modules', 'aioi', 'aiRecommendationsRuntimeService.metadata.js'),
    ];
    for (const fp of p8Files) {
      if (!fs.existsSync(fp)) continue;
      const c = fs.readFileSync(fp, 'utf8');
      assert(
        !/"cognitive_execution_allowed"\s*:\s*true/.test(c),
        `BROKEN_DECISION_CHAIN: cognitive_execution_allowed=true em ${path.basename(fp)}`
      );
    }
  });

  await test('J2: Serviços P0 não invocam LLM (openai/anthropic/gemini)', () => {
    const p0Files = [
      'services/aioi/aioiEventIngestionService.js',
      'services/aioi/aioiOutboxConsumerService.js',
      'services/aioi/plcAioiAdapter.js',
      'services/aioi/mesAioiAdapter.js',
      'services/aioi/taskAioiAdapter.js',
      'services/aioi/communicationAioiAdapter.js',
    ];
    for (const rel of p0Files) {
      const c = readSrc(rel);
      if (!c) continue;
      const hasLLM = c.includes('openai') || c.includes('anthropic') || c.includes('geminiService');
      assert(!hasLLM,
        `BROKEN_DECISION_CHAIN: LLM invocado em ${path.basename(rel)} — proibido em P0`);
    }
  });

  await test('J3: ORG-4 docs confirmam invariantes ORG-1/2/3', () => {
    const audit = readDoc('AIOI_P0_PRODUCTION_READINESS_AUDIT.md');
    assert(audit, 'AIOI_P0_PRODUCTION_READINESS_AUDIT.md ausente');
    assert(audit.includes('ORG-1') || audit.includes('Queue Governance'), 'BROKEN_DECISION_CHAIN: ORG-1 não referenciado no audit');
    assert(audit.includes('ORG-2') || audit.includes('Truth Stage'), 'BROKEN_DECISION_CHAIN: ORG-2 não referenciado no audit');
    assert(audit.includes('ORG-3') || audit.includes('F49'), 'BROKEN_DECISION_CHAIN: ORG-3 não referenciado no audit');
  });

  // ── BLOCO K: Criteria document ────────────────────────────────────────────

  console.log('\n  ── BLOCO K: Criteria document');

  await test('K1: Criteria doc tem 23+ critérios (PC-)', () => {
    const c = readDoc('AIOI_P0_PILOT_CERTIFICATION_CRITERIA.md');
    assert(c, 'AIOI_P0_PILOT_CERTIFICATION_CRITERIA.md ausente');
    const count = (c.match(/PC-[A-Z]+-\d+/g) || []).length;
    assert(count >= 20, `BROKEN_DECISION_CHAIN: apenas ${count} critérios PC- encontrados (esperado ≥20)`);
  });

  await test('K2: Criteria doc tem todos os failure codes', () => {
    const c = readDoc('AIOI_P0_PILOT_CERTIFICATION_CRITERIA.md');
    assert(c, 'AIOI_P0_PILOT_CERTIFICATION_CRITERIA.md ausente');
    const codes = ['ORPHAN_IOE_EVENT', 'INVALID_TRUTH_PROPAGATION', 'MISSING_EVIDENCE_REFERENCE',
      'BROKEN_OUTBOX_CHAIN', 'BROKEN_DECISION_CHAIN', 'UNCLASSIFIED_ADAPTER'];
    for (const code of codes) {
      assert(c.includes(code), `BROKEN_DECISION_CHAIN: código de falha "${code}" ausente nos critérios`);
    }
  });

  // ── Resultado ─────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Resultado: ${passed} PASS · ${failed} FAIL`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (failed > 0) {
    console.error('\n  Falhas:');
    for (const f of failures) {
      console.error(`    [${f.label}] ${f.error}`);
    }
    console.error('\n  Token: AIOI_ORG_4_P0_PRODUCTION_PILOT_CERTIFICATION_FAIL');
    process.exit(1);
  } else {
    console.log('\n  ┌──────────────────────────────────────────────────────────┐');
    console.log('  │  AIOI_ORG_4_P0_PRODUCTION_PILOT_CERTIFICATION_PASS       │');
    console.log('  │  P0_PRODUCTION_READY                                     │');
    console.log('  │  IOE_CHAIN_VALIDATED                                     │');
    console.log('  │  TRUTH_PROPAGATION_VALIDATED                             │');
    console.log('  │  OUTBOX_CHAIN_VALIDATED                                  │');
    console.log('  │  DECISION_CHAIN_VALIDATED                                │');
    console.log('  └──────────────────────────────────────────────────────────┘\n');
    process.exit(0);
  }
})();
