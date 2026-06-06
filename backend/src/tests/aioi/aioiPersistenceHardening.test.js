'use strict';

/**
 * AIOI-P1.4 — Testes automatizados da Operational Persistence Hardening Layer
 *
 * T1–T20 conforme especificação P1.4.
 * Executar: node src/tests/aioi/aioiPersistenceHardening.test.js
 */

let _passed = 0;
let _failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}
function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message} — expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`);
}

async function test(name, fn) {
  try {
    await fn();
    _passed++;
    console.log(`  ✓  ${name}`);
  } catch (err) {
    _failed++;
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

const metrics = require(`${SERVICES_PATH}/aioiPersistenceMetrics`);

const COMPANY_ID   = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const COMPANY_ID_B = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';
const IOE_ID       = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33';
const CORR_ID       = 'corr-persist-001';

const DB_MOD_PATH = require.resolve('../../db');
require(DB_MOD_PATH);
let _originalDb;

function patchDb(mock) {
  _originalDb = require.cache[DB_MOD_PATH].exports;
  require.cache[DB_MOD_PATH].exports = mock;
}
function restoreDb() {
  if (_originalDb && require.cache[DB_MOD_PATH]) {
    require.cache[DB_MOD_PATH].exports = _originalDb;
  }
}

function loadServices() {
  const modules = [
    'aioiAuditPersistenceService',
    'aioiMetricsSnapshotService',
    'aioiProcessingHistoryService'
  ];
  const loaded = {};
  for (const mod of modules) {
    const resolved = require.resolve(`${SERVICES_PATH}/${mod}`);
    delete require.cache[resolved];
    loaded[mod] = require(resolved);
  }
  return loaded;
}

function createPersistenceDbMock() {
  const calls = [];
  const auditEvents = [];
  const snapshots = [];
  const history = [];

  const client = {
    _calls: calls,
    get auditEvents() { return auditEvents; },
    get snapshots() { return snapshots; },
    get history() { return history; },
    async query(sql, params) {
      const s = sql.trim();
      calls.push({ sql: s, params });

      if (calls._failNext) {
        calls._failNext = false;
        throw new Error('DB_MOCK: simulated failure');
      }

      if (s.includes('set_config')) return { rows: [] };

      // INSERT audit
      if (s.includes('INSERT INTO aioi_audit_events')) {
        const existing = auditEvents.find(e =>
          e.company_id === params[0]
            && e.correlation_id === params[2]
            && e.event_type === params[3]
        );
        if (existing) return { rows: [] };
        const row = {
          id: `audit-${auditEvents.length + 1}`,
          company_id: params[0],
          ioe_id: params[1],
          correlation_id: params[2],
          event_type: params[3],
          event_source: params[4],
          payload: typeof params[5] === 'string' ? JSON.parse(params[5]) : params[5]
        };
        auditEvents.push(row);
        return { rows: [{ id: row.id }] };
      }

      // INSERT snapshot
      if (s.includes('INSERT INTO aioi_metrics_snapshots')) {
        const existing = snapshots.find(snap =>
          snap.company_id === params[0] && snap.idempotency_key === params[3]
        );
        if (existing) return { rows: [] };
        const row = {
          id: `snap-${snapshots.length + 1}`,
          company_id: params[0],
          snapshot_type: params[1],
          snapshot_payload: typeof params[2] === 'string' ? JSON.parse(params[2]) : params[2],
          idempotency_key: params[3]
        };
        snapshots.push(row);
        return { rows: [{ id: row.id }] };
      }

      // INSERT history
      if (s.includes('INSERT INTO aioi_processing_history')) {
        const existing = history.find(h =>
          h.company_id === params[0] && h.idempotency_key === params[6]
        );
        if (existing) return { rows: [] };
        const row = {
          id: `hist-${history.length + 1}`,
          company_id: params[0],
          ioe_id: params[1],
          status_from: params[2],
          status_to: params[3],
          source_layer: params[4],
          correlation_id: params[5],
          idempotency_key: params[6],
          created_at: new Date().toISOString()
        };
        history.push(row);
        return { rows: [{ id: row.id }] };
      }

      // SELECT history
      if (s.includes('FROM aioi_processing_history') && s.includes('SELECT')) {
        const rows = history.filter(h =>
          h.company_id === params[0] && h.ioe_id === params[1]
        );
        return { rows: rows.slice(0, params[2]) };
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

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function readServiceFiles() {
  const files = [
    'aioiPersistenceMetrics.js',
    'aioiAuditPersistenceService.js',
    'aioiMetricsSnapshotService.js',
    'aioiProcessingHistoryService.js'
  ];
  return files.map(f => ({
    name: f,
    content: fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')
  }));
}

function assertNoForbiddenWrites(calls) {
  for (const c of calls) {
    const s = c.sql.trim().toUpperCase();
    if (s.startsWith('UPDATE') || s.startsWith('DELETE')) {
      throw new Error(`escrita proibida: ${c.sql.slice(0, 80)}`);
    }
    if (s.startsWith('INSERT')) {
      assert(!c.sql.includes('industrial_operational_events'), 'INSERT em IOE legado');
      assert(!c.sql.includes('aioi_outbox'), 'INSERT em outbox legado');
    }
  }
}

async function runTests() {
  metrics.resetSessionCounters();

  // T1
  suite('T1 — Persistência de audit event');
  await test('T1: persistAuditEvent grava em aioi_audit_events', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    const result = await svc.aioiAuditPersistenceService.persistAuditEvent({
      companyId: COMPANY_ID,
      ioeId: IOE_ID,
      correlationId: CORR_ID,
      eventType: 'AIOI_APPROVED',
      eventSource: 'aioi_approval_layer',
      payload: { user_id: 'user-1' }
    });

    assert(result.ok, 'ok');
    assert(result.persisted, 'persisted');
    assertEqual(mock._client.auditEvents.length, 1, '1 evento');
    restoreDb();
  });

  // T2
  suite('T2 — Persistência de lifecycle snapshot');
  await test('T2: persistLifecycleSnapshot grava snapshot', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    const result = await svc.aioiMetricsSnapshotService.persistLifecycleSnapshot({
      companyId: COMPANY_ID,
      snapshot: { open: 5, triaged: 3 },
      idempotencyKey: 'lifecycle_snapshot:test-1'
    });

    assert(result.ok, 'ok');
    assert(result.persisted, 'persisted');
    assertEqual(mock._client.snapshots[0].snapshot_type, 'lifecycle_snapshot', 'type');
    restoreDb();
  });

  // T3
  suite('T3 — Persistência de KPI snapshot');
  await test('T3: persistCycleKpis grava cycle_kpis', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    const result = await svc.aioiMetricsSnapshotService.persistCycleKpis({
      companyId: COMPANY_ID,
      kpis: { end_to_end_cycle_time: 3600000 },
      idempotencyKey: 'cycle_kpis:test-1'
    });

    assert(result.ok, 'ok');
    assertEqual(mock._client.snapshots[0].snapshot_type, 'cycle_kpis', 'type');
    restoreDb();
  });

  // T4
  suite('T4 — Persistência de backlog snapshot');
  await test('T4: persistBacklogSnapshot grava backlog_snapshot', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    const result = await svc.aioiMetricsSnapshotService.persistBacklogSnapshot({
      companyId: COMPANY_ID,
      backlogs: { approval: 2, execution: 1 },
      idempotencyKey: 'backlog_snapshot:test-1'
    });

    assert(result.ok, 'ok');
    assertEqual(mock._client.snapshots[0].snapshot_type, 'backlog_snapshot', 'type');
    restoreDb();
  });

  // T5
  suite('T5 — Persistência de processing history');
  await test('T5: recordTransition grava histórico', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    const result = await svc.aioiProcessingHistoryService.recordTransition({
      companyId: COMPANY_ID,
      ioeId: IOE_ID,
      statusFrom: 'open',
      statusTo: 'triaged',
      sourceLayer: 'consumer',
      correlationId: CORR_ID
    });

    assert(result.ok, 'ok');
    assert(result.persisted, 'persisted');
    assertEqual(mock._client.history.length, 1, '1 registro');
    restoreDb();
  });

  // T6
  suite('T6 — Idempotência audit event');
  await test('T6: audit event duplicado retorna alreadyPersisted', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    const params = {
      companyId: COMPANY_ID,
      ioeId: IOE_ID,
      correlationId: CORR_ID,
      eventType: 'AIOI_EXECUTION_DELEGATED',
      eventSource: 'aioi_execution_bridge',
      payload: {}
    };
    await svc.aioiAuditPersistenceService.persistAuditEvent(params);
    const result = await svc.aioiAuditPersistenceService.persistAuditEvent(params);

    assertEqual(result.ok, true, 'ok');
    assertEqual(result.alreadyPersisted, true, 'alreadyPersisted');
    assertEqual(mock._client.auditEvents.length, 1, 'sem duplicata');
    restoreDb();
  });

  // T7
  suite('T7 — Idempotência snapshot');
  await test('T7: snapshot duplicado retorna alreadyPersisted', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    const params = {
      companyId: COMPANY_ID,
      snapshot: { open: 1 },
      idempotencyKey: 'lifecycle_snapshot:dup'
    };
    await svc.aioiMetricsSnapshotService.persistLifecycleSnapshot(params);
    const result = await svc.aioiMetricsSnapshotService.persistLifecycleSnapshot(params);

    assertEqual(result.alreadyPersisted, true, 'alreadyPersisted');
    assertEqual(mock._client.snapshots.length, 1, 'sem duplicata');
    restoreDb();
  });

  // T8
  suite('T8 — Idempotência processing history');
  await test('T8: history duplicado retorna alreadyPersisted', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    const params = {
      companyId: COMPANY_ID,
      ioeId: IOE_ID,
      statusFrom: 'triaged',
      statusTo: 'approved',
      sourceLayer: 'approval',
      correlationId: CORR_ID,
      idempotencyKey: `${IOE_ID}:triaged:approved:approval:${CORR_ID}`
    };
    await svc.aioiProcessingHistoryService.recordTransition(params);
    const result = await svc.aioiProcessingHistoryService.recordTransition(params);

    assertEqual(result.alreadyPersisted, true, 'alreadyPersisted');
    assertEqual(mock._client.history.length, 1, 'sem duplicata');
    restoreDb();
  });

  // T9
  suite('T9 — RLS preservado');
  await test('T9: bypass_rls sempre false', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    await svc.aioiAuditPersistenceService.persistAuditEvent({
      companyId: COMPANY_ID,
      ioeId: IOE_ID,
      correlationId: CORR_ID,
      eventType: 'AIOI_OUTCOME_CAPTURED',
      eventSource: 'aioi_outcome_tracking',
      payload: {}
    });

    const bypassCalls = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(bypassCalls.length >= 1, 'bypass_rls');
    for (const c of bypassCalls) assert(c.sql.includes("'false'"), "bypass_rls='false'");
    restoreDb();
  });

  // T10
  suite('T10 — Multi-tenant preservado');
  await test('T10: set_config usa companyId correto', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    await svc.aioiMetricsSnapshotService.persistLifecycleSnapshot({
      companyId: COMPANY_ID_B,
      snapshot: { open: 1 },
      idempotencyKey: 'lifecycle_snapshot:tenant-b'
    });

    const tenantCalls = mock._client._calls.filter(c => c.sql.includes('app.current_company_id'));
    assert(tenantCalls.length >= 1, 'set_config');
    assertEqual(tenantCalls[0].params[0], COMPANY_ID_B, 'company id');
    restoreDb();
  });

  // T11
  suite('T11 — Rollback em erro');
  await test('T11: erro de persistência retorna ok=false', async () => {
    const mock = createPersistenceDbMock();
    mock._client._calls._failNext = true;
    patchDb(mock);
    const svc = loadServices();

    const result = await svc.aioiProcessingHistoryService.recordTransition({
      companyId: COMPANY_ID,
      ioeId: IOE_ID,
      statusTo: 'resolved',
      sourceLayer: 'outcome',
      correlationId: CORR_ID
    });

    assertEqual(result.ok, false, 'ok false');
    assert(result.error, 'error');
    restoreDb();
  });

  // T12
  suite('T12 — Nenhum UPDATE executado');
  await test('T12: serviços não executam UPDATE', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    await svc.aioiAuditPersistenceService.persistApprovalAudit({
      companyId: COMPANY_ID, ioeId: IOE_ID, correlationId: CORR_ID,
      action: 'approved', payload: {}
    });
    await svc.aioiMetricsSnapshotService.persistCycleKpis({
      companyId: COMPANY_ID, kpis: {}, idempotencyKey: 'kpi:1'
    });
    await svc.aioiProcessingHistoryService.recordTransition({
      companyId: COMPANY_ID, ioeId: IOE_ID, statusTo: 'in_progress',
      sourceLayer: 'execution', correlationId: CORR_ID
    });

    for (const c of mock._client._calls) {
      assert(!c.sql.trim().toUpperCase().startsWith('UPDATE'), 'sem UPDATE');
    }
    restoreDb();
  });

  // T13
  suite('T13 — Nenhum DELETE executado');
  await test('T13: serviços não executam DELETE', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    await svc.aioiAuditPersistenceService.persistLearningAudit({
      companyId: COMPANY_ID, ioeId: IOE_ID, correlationId: CORR_ID,
      phase: 'submitted', payload: {}
    });

    for (const c of mock._client._calls) {
      assert(!c.sql.trim().toUpperCase().startsWith('DELETE'), 'sem DELETE');
    }
    restoreDb();
  });

  // T14
  suite('T14 — Nenhum INSERT em tabelas antigas');
  await test('T14: INSERT apenas em tabelas P1.4', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    await svc.aioiAuditPersistenceService.persistExecutionAudit({
      companyId: COMPANY_ID, ioeId: IOE_ID, correlationId: CORR_ID,
      phase: 'requested', payload: {}
    });

    assertNoForbiddenWrites(mock._client._calls);
    const inserts = mock._client._calls.filter(c => c.sql.includes('INSERT INTO'));
    assert(inserts.every(c =>
      c.sql.includes('aioi_audit_events')
        || c.sql.includes('aioi_metrics_snapshots')
        || c.sql.includes('aioi_processing_history')
    ), 'somente tabelas novas');
    restoreDb();
  });

  // T15–T18 forbidden sovereigns
  const forbidden = [
    { suite: 'T15', pattern: 'workflowOrchestrator' },
    { suite: 'T16', pattern: 'actionRuntimeOrchestrator' },
    { suite: 'T17', pattern: 'operationalDecisionEngine' },
    { suite: 'T18', pattern: 'operationalLearningService' }
  ];

  for (const fc of forbidden) {
    suite(`${fc.suite} — ${fc.pattern} ausente`);
    await test(`${fc.suite}: arquivos P1.4 não referenciam ${fc.pattern}`, () => {
      const files = readServiceFiles();
      for (const f of files) {
        const code = stripComments(f.content);
        assert(!code.includes(fc.pattern), f.name);
      }
    });
  }

  // T19
  suite('T19 — Logs corretos');
  await test('T19: aioiPersistenceMetrics emite os 5 labels obrigatórios', () => {
    const src = fs.readFileSync(path.join(SERVICES_PATH, 'aioiPersistenceMetrics.js'), 'utf8');
    assert(src.includes('AIOI_AUDIT_PERSISTED'), 'AUDIT_PERSISTED');
    assert(src.includes('AIOI_METRIC_SNAPSHOT_PERSISTED'), 'SNAPSHOT_PERSISTED');
    assert(src.includes('AIOI_HISTORY_PERSISTED'), 'HISTORY_PERSISTED');
    assert(src.includes('AIOI_PERSISTENCE_SKIPPED'), 'SKIPPED');
    assert(src.includes('AIOI_PERSISTENCE_ERROR'), 'ERROR');
  });

  // T20
  suite('T20 — Métricas corretas');
  await test('T20: getSessionCounters expõe contadores P1.4', async () => {
    metrics.resetSessionCounters();
    metrics.recordAuditPersisted(COMPANY_ID, 'AIOI_APPROVED', IOE_ID);
    metrics.recordMetricSnapshotPersisted(COMPANY_ID, 'lifecycle_snapshot');
    metrics.recordHistoryPersisted(COMPANY_ID, IOE_ID, 'consumer');
    metrics.recordSkipped(COMPANY_ID, 'dup');
    metrics.recordError(COMPANY_ID, 'ctx', 'err');

    const c = metrics.getSessionCounters();
    assertEqual(c.audit_persisted_count, 1, 'audit');
    assertEqual(c.snapshot_persisted_count, 1, 'snapshot');
    assertEqual(c.history_persisted_count, 1, 'history');
    assertEqual(c.persistence_skipped_count, 1, 'skipped');
    assertEqual(c.persistence_error_count, 1, 'errors');
  });

  // T21 bonus - getProcessingHistory read only
  suite('T21 — getProcessingHistory read-only');
  await test('T21: getProcessingHistory retorna histórico sem escrita', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    await svc.aioiProcessingHistoryService.recordTransition({
      companyId: COMPANY_ID, ioeId: IOE_ID, statusFrom: 'open',
      statusTo: 'triaged', sourceLayer: 'adapter', correlationId: CORR_ID
    });

    const beforeCalls = mock._client._calls.length;
    const result = await svc.aioiProcessingHistoryService.getProcessingHistory({
      companyId: COMPANY_ID, ioeId: IOE_ID
    });

    assert(result.ok, 'ok');
    assertEqual(result.count, 1, 'count');
    const newCalls = mock._client._calls.slice(beforeCalls);
    const dataCalls = newCalls.filter(c => {
      const s = c.sql.trim().toUpperCase();
      return !s.includes('SET_CONFIG') && s !== 'BEGIN' && s !== 'COMMIT' && s !== 'ROLLBACK';
    });
    assert(dataCalls.every(c => c.sql.includes('SELECT')), 'somente SELECT na leitura');
    assertNoForbiddenWrites(newCalls);
    restoreDb();
  });

  // T22 bonus - wrapper functions
  suite('T22 — Wrappers de auditoria');
  await test('T22: persistOutcomeAudit e persistLearningAudit funcionam', async () => {
    const mock = createPersistenceDbMock();
    patchDb(mock);
    const svc = loadServices();

    await svc.aioiAuditPersistenceService.persistOutcomeAudit({
      companyId: COMPANY_ID, ioeId: IOE_ID, correlationId: 'corr-out',
      payload: { outcome_status: 'success' }
    });
    await svc.aioiAuditPersistenceService.persistLearningAudit({
      companyId: COMPANY_ID, ioeId: IOE_ID, correlationId: 'corr-learn',
      phase: 'processed', payload: {}
    });

    assertEqual(mock._client.auditEvents.length, 2, '2 eventos');
    assert(mock._client.auditEvents.some(e => e.event_type === 'AIOI_OUTCOME_CAPTURED'));
    assert(mock._client.auditEvents.some(e => e.event_type === 'AIOI_LEARNING_PROCESSED'));
    restoreDb();
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P1.4 Persistence Hardening Test Report');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log('');
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P1_4_TEST_PASS' : 'AIOI_P1_4_TEST_FAIL'}`);
  console.log('');

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
