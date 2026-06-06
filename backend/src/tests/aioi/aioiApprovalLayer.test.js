'use strict';

/**
 * AIOI-P0.5 — Testes automatizados da HITL Approval Layer
 *
 * T1–T15 conforme especificação P0.5.
 * Executar: node src/tests/aioi/aioiApprovalLayer.test.js
 */

let _passed = 0;
let _failed = 0;
const _results = [];

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}
function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message} — expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`);
}
function assertNotNull(value, message) {
  if (value == null) throw new Error(`${message} — valor é null/undefined`);
}

async function test(name, fn) {
  try {
    await fn();
    _passed++;
    _results.push({ name, status: 'PASS' });
    console.log(`  ✓  ${name}`);
  } catch (err) {
    _failed++;
    _results.push({ name, status: 'FAIL', error: err.message });
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
  }
}

function suite(name) {
  console.log(`\n[SUITE] ${name}`);
}

const path = require('path');
const fs = require('fs');
const SERVICES_PATH = path.resolve(__dirname, '../../services/aioi');

const auditService = require(`${SERVICES_PATH}/aioiApprovalAuditService`);
const metrics = require(`${SERVICES_PATH}/aioiApprovalMetrics`);

const DB_MOD_PATH = (() => { try { return require.resolve('../../db'); } catch { return null; } })();
let _originalDb;

function patchDb(mock) {
  if (DB_MOD_PATH && require.cache[DB_MOD_PATH]) {
    _originalDb = require.cache[DB_MOD_PATH].exports;
    require.cache[DB_MOD_PATH].exports = mock;
  }
}
function restoreDb() {
  if (DB_MOD_PATH && _originalDb && require.cache[DB_MOD_PATH]) {
    require.cache[DB_MOD_PATH].exports = _originalDb;
  }
}
function invalidate(relPath) {
  delete require.cache[require.resolve(`${SERVICES_PATH}/${relPath}`)];
}

// Fixtures
const COMPANY_ID  = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const IOE_ID      = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33';
const USER_ID     = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55';
const OTHER_USER  = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66';

const decisionPayload = {
  recommendation: 'Investigar equipamento',
  rationale:      'Degradação detectada',
  confidence:     90,
  source:         'operationalDecisionEngine',
  generated_at:   '2026-06-05T10:00:00.000Z'
};

function makeIoe(overrides = {}) {
  return {
    id:                  IOE_ID,
    company_id:          COMPANY_ID,
    status:              'triaged',
    decision_type:       'suggest_only',
    decision_payload:    decisionPayload,
    correlation_id:      'ioe-corr-abc-123',
    approved_by_user_id: null,
    approved_at:         null,
    resolution_notes:    null,
    ...overrides
  };
}

/**
 * Mock DB com estado mutável do IOE simulado.
 */
function createApprovalDbMock(initialIoe = makeIoe()) {
  const calls = [];
  let ioeState = { ...initialIoe };

  const client = {
    _calls: calls,
    get state() { return ioeState; },
    setState(next) { ioeState = { ...ioeState, ...next }; },
    async query(sql, params) {
      const s = sql.trim();
      calls.push({ sql: s, params });

      if (s.includes('DB_MOCK_FAIL') || (s.includes('UPDATE') && calls._failNextUpdate)) {
        calls._failNextUpdate = false;
        throw new Error('DB_MOCK: simulated failure');
      }

      // SELECT IOE
      if (s.includes('SELECT') && s.includes('industrial_operational_events') && s.includes('WHERE id')) {
        if (s.includes('pending_approval') && s.includes('LIMIT')) {
          return ioeState.status === 'pending_approval' ? { rows: [ioeState] } : { rows: [] };
        }
        return { rows: [ioeState] };
      }

      // UPDATE moveToPendingApproval (SET only — não confundir com WHERE status = 'pending_approval')
      if (s.includes('SET status     = \'pending_approval\'') ||
          s.includes('SET status = \'pending_approval\'')) {
        if (ioeState.status === 'triaged' && ioeState.decision_type && ioeState.decision_payload) {
          ioeState = { ...ioeState, status: 'pending_approval' };
          return { rows: [{ id: IOE_ID }] };
        }
        return { rows: [] };
      }

      // UPDATE approve (SET status = 'approved')
      if (s.includes("SET status              = 'approved'") || s.includes("SET status = 'approved'")) {
        if (ioeState.status === 'pending_approval' && !ioeState.approved_by_user_id && !ioeState.approved_at) {
          ioeState = {
            ...ioeState,
            status:              'approved',
            approved_by_user_id: params[2],
            approved_at:         new Date().toISOString()
          };
          return {
            rows: [{
              id:                  IOE_ID,
              decision_type:       ioeState.decision_type,
              correlation_id:      ioeState.correlation_id,
              approved_by_user_id: ioeState.approved_by_user_id,
              approved_at:         ioeState.approved_at
            }]
          };
        }
        return { rows: [] };
      }

      // UPDATE reject (SET status = 'rejected')
      if (s.includes("SET status              = 'rejected'") || s.includes("SET status = 'rejected'")) {
        if (ioeState.status === 'pending_approval') {
          ioeState = {
            ...ioeState,
            status:              'rejected',
            approved_by_user_id: null,
            approved_at:         null
          };
          return {
            rows: [{
              id:             IOE_ID,
              decision_type:  ioeState.decision_type,
              correlation_id: ioeState.correlation_id
            }]
          };
        }
        return { rows: [] };
      }

      return { rows: [] };
    },
    release: () => {}
  };

  return {
    pool: { connect: async () => client },
    query: async (sql, params) => client.query(sql, params),
    _client: client
  };
}

async function runAllTests() {
  auditService.clearAuditLog();
  metrics.resetSessionCounters();

  // ---------------------------------------------------------------------------
  suite('T1 — triaged → pending_approval');
  await test('T1: moveToPendingApproval transiciona triaged com decisão para pending_approval', async () => {
    const dbMock = createApprovalDbMock(makeIoe());
    patchDb(dbMock);
    invalidate('aioiApprovalService.js');
    const svc = require(`${SERVICES_PATH}/aioiApprovalService`);

    const result = await svc.moveToPendingApproval({ companyId: COMPANY_ID, ioeId: IOE_ID });

    restoreDb();
    assert(result.ok, `deve retornar ok=true, erro: ${result.error}`);
    assertEqual(dbMock._client.state.status, 'pending_approval', 'status deve ser pending_approval');
  });

  // ---------------------------------------------------------------------------
  suite('T2 — pending_approval → approved');
  await test('T2: approveDecision transiciona pending_approval para approved', async () => {
    const dbMock = createApprovalDbMock(makeIoe({ status: 'pending_approval' }));
    patchDb(dbMock);
    invalidate('aioiApprovalService.js');
    const svc = require(`${SERVICES_PATH}/aioiApprovalService`);

    const result = await svc.approveDecision({
      companyId: COMPANY_ID,
      ioeId: IOE_ID,
      approvedByUserId: USER_ID
    });

    restoreDb();
    assert(result.ok, `deve retornar ok=true, erro: ${result.error}`);
    assert(result.approved, 'approved deve ser true');
    assertEqual(dbMock._client.state.status, 'approved', 'status deve ser approved');
  });

  // ---------------------------------------------------------------------------
  suite('T3 — pending_approval → rejected');
  await test('T3: rejectDecision transiciona pending_approval para rejected', async () => {
    auditService.clearAuditLog();
    const dbMock = createApprovalDbMock(makeIoe({ status: 'pending_approval' }));
    patchDb(dbMock);
    invalidate('aioiApprovalService.js');
    const svc = require(`${SERVICES_PATH}/aioiApprovalService`);

    const result = await svc.rejectDecision({
      companyId: COMPANY_ID,
      ioeId: IOE_ID,
      rejectedByUserId: USER_ID,
      rejectionNotes: 'Não aplicável neste momento'
    });

    restoreDb();
    assert(result.ok, `deve retornar ok=true, erro: ${result.error}`);
    assert(result.rejected, 'rejected deve ser true');
    assertEqual(dbMock._client.state.status, 'rejected', 'status deve ser rejected');
  });

  // ---------------------------------------------------------------------------
  suite('T4 — approved_by_user_id preenchido');
  await test('T4: approveDecision preenche approved_by_user_id com UUID do aprovador', async () => {
    auditService.clearAuditLog();
    const dbMock = createApprovalDbMock(makeIoe({ status: 'pending_approval' }));
    patchDb(dbMock);
    invalidate('aioiApprovalService.js');
    const svc = require(`${SERVICES_PATH}/aioiApprovalService`);

    await svc.approveDecision({ companyId: COMPANY_ID, ioeId: IOE_ID, approvedByUserId: USER_ID });

    restoreDb();
    assertEqual(dbMock._client.state.approved_by_user_id, USER_ID, 'approved_by_user_id deve ser o UUID do aprovador');
  });

  // ---------------------------------------------------------------------------
  suite('T5 — approved_at preenchido');
  await test('T5: approveDecision preenche approved_at automaticamente', async () => {
    auditService.clearAuditLog();
    const dbMock = createApprovalDbMock(makeIoe({ status: 'pending_approval' }));
    patchDb(dbMock);
    invalidate('aioiApprovalService.js');
    const svc = require(`${SERVICES_PATH}/aioiApprovalService`);

    await svc.approveDecision({ companyId: COMPANY_ID, ioeId: IOE_ID, approvedByUserId: USER_ID });

    restoreDb();
    assertNotNull(dbMock._client.state.approved_at, 'approved_at deve ser preenchido');
  });

  // ---------------------------------------------------------------------------
  suite('T6 — aprovação duplicada ignorada');
  await test('T6: segunda aprovação retorna alreadyProcessed sem alterar dados', async () => {
    auditService.clearAuditLog();
    const dbMock = createApprovalDbMock(makeIoe({
      status: 'approved',
      approved_by_user_id: USER_ID,
      approved_at: '2026-06-05T10:00:00.000Z'
    }));
    patchDb(dbMock);
    invalidate('aioiApprovalService.js');
    const svc = require(`${SERVICES_PATH}/aioiApprovalService`);

    const result = await svc.approveDecision({
      companyId: COMPANY_ID,
      ioeId: IOE_ID,
      approvedByUserId: OTHER_USER
    });

    restoreDb();
    assert(result.ok, 'ok deve ser true');
    assert(result.alreadyProcessed, 'alreadyProcessed deve ser true');
    assertEqual(dbMock._client.state.approved_by_user_id, USER_ID, 'approved_by_user_id original preservado');
  });

  // ---------------------------------------------------------------------------
  suite('T7 — rejeição duplicada ignorada');
  await test('T7: segunda rejeição retorna alreadyProcessed', async () => {
    auditService.clearAuditLog();
    const dbMock = createApprovalDbMock(makeIoe({ status: 'rejected' }));
    patchDb(dbMock);
    invalidate('aioiApprovalService.js');
    const svc = require(`${SERVICES_PATH}/aioiApprovalService`);

    const result = await svc.rejectDecision({
      companyId: COMPANY_ID,
      ioeId: IOE_ID,
      rejectedByUserId: USER_ID
    });

    restoreDb();
    assert(result.ok, 'ok deve ser true');
    assert(result.alreadyProcessed, 'alreadyProcessed deve ser true');
  });

  // ---------------------------------------------------------------------------
  suite('T8 — RLS preservado');
  await test('T8: operações executam set_config(app.bypass_rls, false)', async () => {
    auditService.clearAuditLog();
    const dbMock = createApprovalDbMock(makeIoe({ status: 'pending_approval' }));
    patchDb(dbMock);
    invalidate('aioiApprovalService.js');
    const svc = require(`${SERVICES_PATH}/aioiApprovalService`);

    await svc.approveDecision({ companyId: COMPANY_ID, ioeId: IOE_ID, approvedByUserId: USER_ID });

    restoreDb();
    const bypassCalls = dbMock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(bypassCalls.length >= 1, 'bypass_rls deve ser configurado');
    for (const call of bypassCalls) {
      assert(call.sql.includes("'false'"), "bypass_rls deve ser 'false'");
    }
  });

  // ---------------------------------------------------------------------------
  suite('T9 — multi-tenant preservado');
  await test('T9: set_config(app.current_company_id) usa companyId correto', async () => {
    auditService.clearAuditLog();
    const dbMock = createApprovalDbMock(makeIoe());
    patchDb(dbMock);
    invalidate('aioiApprovalService.js');
    const svc = require(`${SERVICES_PATH}/aioiApprovalService`);

    await svc.moveToPendingApproval({ companyId: COMPANY_ID, ioeId: IOE_ID });

    restoreDb();
    const setConfigCalls = dbMock._client._calls.filter(
      c => c.sql.includes('app.current_company_id')
    );
    assert(setConfigCalls.length >= 1, 'set_config(app.current_company_id) deve ser chamado');
    for (const call of setConfigCalls) {
      assertEqual(call.params[0], COMPANY_ID, 'company_id correto no set_config');
    }
  });

  // ---------------------------------------------------------------------------
  suite('T10 — rollback em erro');
  await test('T10: erro de DB em approveDecision retorna ok=false', async () => {
    auditService.clearAuditLog();
    metrics.resetSessionCounters();
    const dbMock = createApprovalDbMock(makeIoe({ status: 'pending_approval' }));
    dbMock._client.query = async function (sql, params) {
      this._calls.push({ sql: sql.trim(), params });
      if (sql.trim().includes('UPDATE')) throw new Error('DB_MOCK: simulated failure');
      return { rows: [makeIoe({ status: 'pending_approval' })] };
    };
    dbMock._client._calls = [];
    dbMock._client.release = () => {};
    patchDb(dbMock);
    invalidate('aioiApprovalService.js');
    const svc = require(`${SERVICES_PATH}/aioiApprovalService`);

    const result = await svc.approveDecision({
      companyId: COMPANY_ID,
      ioeId: IOE_ID,
      approvedByUserId: USER_ID
    });

    restoreDb();
    assert(!result.ok, 'ok deve ser false em erro de DB');
    assertNotNull(result.error, 'error deve ser retornado');
  });

  // ---------------------------------------------------------------------------
  suite('T11 — workflowOrchestrator ausente');
  await test('T11: nenhum arquivo P0.5 referencia workflowOrchestrator no código', () => {
    const files = ['aioiApprovalService.js', 'aioiApprovalAuditService.js', 'aioiApprovalMetrics.js'];
    for (const file of files) {
      const src = fs.readFileSync(path.resolve(SERVICES_PATH, file), 'utf8');
      const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      assert(!codeOnly.includes('workflowOrchestrator'), `${file} NÃO deve referenciar workflowOrchestrator`);
      assert(!codeOnly.includes('startWorkflow('), `${file} NÃO deve chamar startWorkflow()`);
    }
  });

  // ---------------------------------------------------------------------------
  suite('T12 — actionRuntimeOrchestrator ausente');
  await test('T12: nenhum arquivo P0.5 referencia actionRuntimeOrchestrator no código', () => {
    const files = ['aioiApprovalService.js', 'aioiApprovalAuditService.js', 'aioiApprovalMetrics.js'];
    for (const file of files) {
      const src = fs.readFileSync(path.resolve(SERVICES_PATH, file), 'utf8');
      const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      assert(!codeOnly.includes('actionRuntimeOrchestrator'), `${file} NÃO deve referenciar actionRuntimeOrchestrator`);
      assert(!codeOnly.includes('executeAction('), `${file} NÃO deve chamar executeAction()`);
    }
  });

  // ---------------------------------------------------------------------------
  suite('T13 — operationalDecisionEngine ausente');
  await test('T13: nenhum arquivo P0.5 referencia operationalDecisionEngine no código', () => {
    const files = ['aioiApprovalService.js', 'aioiApprovalAuditService.js', 'aioiApprovalMetrics.js'];
    for (const file of files) {
      const src = fs.readFileSync(path.resolve(SERVICES_PATH, file), 'utf8');
      const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      assert(!codeOnly.includes('operationalDecisionEngine'), `${file} NÃO deve referenciar operationalDecisionEngine`);
      assert(!codeOnly.includes('evaluateOperationalDecisions('), `${file} NÃO deve chamar evaluateOperationalDecisions()`);
      assert(!codeOnly.includes('computePriorityScore('), `${file} NÃO deve chamar computePriorityScore()`);
    }
  });

  // ---------------------------------------------------------------------------
  suite('T14 — auditoria registrada');
  await test('T14: approveDecision registra entrada em auditService', async () => {
    auditService.clearAuditLog();
    const dbMock = createApprovalDbMock(makeIoe({ status: 'pending_approval' }));
    patchDb(dbMock);
    invalidate('aioiApprovalService.js');
    const svc = require(`${SERVICES_PATH}/aioiApprovalService`);

    await svc.approveDecision({
      companyId: COMPANY_ID,
      ioeId: IOE_ID,
      approvedByUserId: USER_ID,
      approvalNotes: 'Aprovado pelo supervisor'
    });

    restoreDb();
    const entries = auditService.listAuditEntries({ company_id: COMPANY_ID, ioe_id: IOE_ID });
    assert(entries.length >= 1, 'deve haver entrada de auditoria');
    assertEqual(entries[0].action, 'approved', 'action deve ser approved');
    assertEqual(entries[0].user_id, USER_ID, 'user_id correto');
    assertEqual(entries[0].company_id, COMPANY_ID, 'company_id correto');
    assertEqual(entries[0].ioe_id, IOE_ID, 'ioe_id correto');
    assertNotNull(entries[0].timestamp, 'timestamp obrigatório');
  });

  await test('T14b: rejectDecision registra rejeição em auditService', async () => {
    auditService.clearAuditLog();
    const dbMock = createApprovalDbMock(makeIoe({ status: 'pending_approval' }));
    patchDb(dbMock);
    invalidate('aioiApprovalService.js');
    const svc = require(`${SERVICES_PATH}/aioiApprovalService`);

    await svc.rejectDecision({
      companyId: COMPANY_ID,
      ioeId: IOE_ID,
      rejectedByUserId: USER_ID,
      rejectionNotes: 'Rejeitado'
    });

    restoreDb();
    const entries = auditService.listAuditEntries({ ioe_id: IOE_ID });
    assert(entries.some(e => e.action === 'rejected'), 'deve haver entrada rejected');
  });

  // ---------------------------------------------------------------------------
  suite('T15 — logs emitidos corretamente');
  await test('T15: aioiApprovalMetrics.js emite os 5 labels obrigatórios', () => {
    const src = fs.readFileSync(path.resolve(SERVICES_PATH, 'aioiApprovalMetrics.js'), 'utf8');
    const required = [
      'AIOI_PENDING_APPROVAL',
      'AIOI_APPROVED',
      'AIOI_REJECTED',
      'AIOI_APPROVAL_SKIPPED',
      'AIOI_APPROVAL_ERROR'
    ];
    for (const label of required) {
      assert(src.includes(label), `métricas devem incluir label ${label}`);
    }
  });

  await test('T15b: moveToPendingApproval falha com DECISION_REQUIRED sem decisão', async () => {
    auditService.clearAuditLog();
    const dbMock = createApprovalDbMock(makeIoe({ decision_type: null, decision_payload: null }));
    patchDb(dbMock);
    invalidate('aioiApprovalService.js');
    const svc = require(`${SERVICES_PATH}/aioiApprovalService`);

    const result = await svc.moveToPendingApproval({ companyId: COMPANY_ID, ioeId: IOE_ID });

    restoreDb();
    assert(!result.ok, 'ok deve ser false');
    assertEqual(result.error, 'DECISION_REQUIRED', 'erro deve ser DECISION_REQUIRED');
  });

  // ---------------------------------------------------------------------------
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P0.5 HITL Approval Layer Test Report');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);

  if (_failed > 0) {
    console.log('\n  FALHAS DETECTADAS:');
    _results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    ✗ ${r.name}`);
      console.log(`      ${r.error}`);
    });
    console.log('\n  STATUS: AIOI_P0_5_TEST_FAIL');
    process.exit(1);
  } else {
    console.log('\n  STATUS: AIOI_P0_5_TEST_PASS');
    process.exit(0);
  }
}

runAllTests().catch(err => {
  console.error('[TEST RUNNER] Erro fatal:', err.message);
  process.exit(1);
});
