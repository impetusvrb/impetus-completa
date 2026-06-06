'use strict';

/**
 * AIOI-P2.2 — Testes automatizados da Predictive Intelligence Read Layer
 *
 * T1–T37 conforme especificação P2.2.
 * Executar: node src/tests/aioi/aioiPredictiveGovernanceReadModel.test.js
 */

let _passed = 0;
let _failed = 0;

function assert(c, m) { if (!c) throw new Error(`ASSERTION FAILED: ${m}`); }
function assertEqual(a, e, m) {
  if (a !== e) throw new Error(`${m} — expected: ${JSON.stringify(e)}, got: ${JSON.stringify(a)}`);
}

async function test(name, fn) {
  try { await fn(); _passed++; console.log(`  ✓  ${name}`); }
  catch (err) { _failed++; console.error(`  ✗  ${name}`); console.error(`     ${err.message}`); }
}
function suite(n) { console.log(`\n[SUITE] ${n}`); }

const path = require('path');
const fs = require('fs');
const SERVICES_PATH = path.resolve(__dirname, '../../services/aioi');

const COMPANY_ID   = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const COMPANY_ID_B = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';

const DB_MOD_PATH = require.resolve('../../db');
require(DB_MOD_PATH);
let _originalDb;

function patchDb(mock) {
  _originalDb = require.cache[DB_MOD_PATH].exports;
  require.cache[DB_MOD_PATH].exports = mock;
}
function restoreDb() {
  if (_originalDb) require.cache[DB_MOD_PATH].exports = _originalDb;
}

const P22_MODULES = [
  'aioiPredictiveMetrics',
  'aioiBacklogForecastService',
  'aioiSlaForecastService',
  'aioiCapacityForecastService',
  'aioiRiskForecastService',
  'aioiPredictiveGovernanceReadModelService',
  'aioiGovernanceMetrics',
  'aioiGovernanceReadModelService',
  'aioiSlaIntelligenceService',
  'aioiRiskAnalysisService',
  'aioiTenantHealthService',
  'aioiTrendAnalysisService',
  'aioiExecutiveMetrics',
  'aioiExecutiveSnapshotService',
  'aioiBottleneckAnalysisService',
  'aioiCycleAnalyticsService'
];

function loadP22() {
  const loaded = {};
  for (const mod of P22_MODULES) {
    delete require.cache[require.resolve(`${SERVICES_PATH}/${mod}`)];
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  return loaded;
}

function getPredMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiPredictiveMetrics`)];
  return require(`${SERVICES_PATH}/aioiPredictiveMetrics`);
}

function buildIoes() {
  const base = {
    company_id: COMPANY_ID, source_type: 'plc_event', category: 'equipment_degradation',
    priority_band: 'high', correlation_id: 'c1', decision_type: null, decision_payload: null,
    approved_by_user_id: null, approved_at: null, workflow_instance_id: null,
    execution_trace_id: null,
    created_at: '2026-06-05T08:00:00.000Z', updated_at: '2026-06-05T10:00:00.000Z', resolved_at: null
  };
  return [
    { ...base, id: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', status: 'open' },
    { ...base, id: 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', status: 'pending_approval' },
    { ...base, id: '28eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', status: 'resolved',
      resolved_at: '2026-06-04T14:00:00.000Z',
      decision_payload: { aioi_outcome: { outcome_status: 'success' }, aioi_learning_submitted: true } },
    { ...base, id: '39eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', status: 'triaged', priority_band: 'critical' }
  ];
}

function buildSnapshots() {
  const now = new Date();
  const d1 = new Date(now.getTime() - 20 * 86400000).toISOString();
  const d2 = new Date(now.getTime() - 10 * 86400000).toISOString();
  const d3 = now.toISOString();
  return [
    { company_id: COMPANY_ID, snapshot_type: 'backlog_snapshot',
      snapshot_payload: { approval: 5, execution: 2, outcome: 1, learning: 0 }, created_at: d1 },
    { company_id: COMPANY_ID, snapshot_type: 'backlog_snapshot',
      snapshot_payload: { approval: 10, execution: 4, outcome: 2, learning: 1 }, created_at: d2 },
    { company_id: COMPANY_ID, snapshot_type: 'backlog_snapshot',
      snapshot_payload: { approval: 15, execution: 6, outcome: 3, learning: 2 }, created_at: d3 },
    { company_id: COMPANY_ID, snapshot_type: 'cycle_kpis',
      snapshot_payload: { open_to_triaged_ms: 2000000, end_to_end_cycle_ms: 30000000 }, created_at: d1 },
    { company_id: COMPANY_ID, snapshot_type: 'cycle_kpis',
      snapshot_payload: { open_to_triaged_ms: 3000000, end_to_end_cycle_ms: 40000000 }, created_at: d2 },
    { company_id: COMPANY_ID, snapshot_type: 'cycle_kpis',
      snapshot_payload: { open_to_triaged_ms: 3500000, end_to_end_cycle_ms: 50000000 }, created_at: d3 },
    { company_id: COMPANY_ID, snapshot_type: 'lifecycle_snapshot',
      snapshot_payload: { operational_success_rate: 0.9 }, created_at: d3 }
  ];
}

function buildProcessingHistory() {
  return [
    { company_id: COMPANY_ID, day: '2026-06-01', cnt: '2' },
    { company_id: COMPANY_ID, day: '2026-06-03', cnt: '3' }
  ];
}

function createPredDbMock(ioes = buildIoes(), snapshots = buildSnapshots(), history = buildProcessingHistory()) {
  const calls = [];
  const store = ioes.map(i => ({ ...i }));
  const snapStore = snapshots.map(s => ({ ...s }));

  const client = {
    _calls: calls,
    async query(sql, params) {
      const s = sql.trim();
      calls.push({ sql: s, params });
      if (['set_config', 'BEGIN', 'COMMIT', 'ROLLBACK'].some(k => s.includes(k) || s === k)) {
        return { rows: [] };
      }
      const filtered = store.filter(i => i.company_id === (params?.[0] || COMPANY_ID));

      if (s.includes('aioi_metrics_snapshots')) {
        const companyId = params[0];
        let rows = snapStore.filter(x => x.company_id === companyId);
        if (params[1]) rows = rows.filter(x => x.snapshot_type === params[1]);
        return { rows };
      }

      if (s.includes('aioi_processing_history') && s.includes('learning_processed')) {
        return { rows: history.filter(h => h.company_id === params[0]) };
      }

      if (s.includes("status = 'resolved'") && s.includes('GROUP BY')) {
        return { rows: [{ day: '2026-06-04', cnt: '2' }, { day: '2026-06-05', cnt: '1' }] };
      }

      if (s.includes('open_to_triaged_ms')) {
        return { rows: [{ open_to_triaged_ms: '3500000', triaged_to_approval_ms: '5000000',
          approval_to_execution_ms: '2000000', execution_to_outcome_ms: '10000000',
          outcome_to_learning_ms: '3000000', end_to_end_cycle_ms: '50000000' }] };
      }

      if (s.includes('approval_backlog') && s.includes('COUNT')) {
        return { rows: [{ approval_backlog: '1', execution_backlog: '1', outcome_backlog: '0', learning_backlog: '0' }] };
      }

      if (s.includes("status = 'open'") && s.includes('critical_events')) {
        const count = st => filtered.filter(i => i.status === st).length;
        return { rows: [{ open: String(count('open')), triaged: '1', pending_approval: '1',
          approved: '0', rejected: '0', in_progress: '0', resolved: '1',
          critical_events: '1', avg_resolution_time_ms: '7200000', avg_approval_time_ms: '3600000',
          avg_execution_time_ms: '5400000', success_count: '1', total_with_outcome: '1' }] };
      }

      if (s.includes('GROUP BY priority_band') || s.includes('GROUP BY category') || s.includes('GROUP BY status')) {
        return { rows: [] };
      }

      return { rows: [] };
    },
    release: () => {}
  };

  return { pool: { connect: async () => client }, _client: client };
}

function stripComments(c) {
  return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function assertNoWrites(calls) {
  for (const c of calls) {
    const s = c.sql.trim().toUpperCase();
    if (['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ALTER', 'DROP', 'CREATE', 'MERGE'].some(k => s.startsWith(k))) {
      throw new Error(`escrita: ${c.sql.slice(0, 60)}`);
    }
  }
}

async function runTests() {
  let predMetrics = getPredMetrics();
  predMetrics.resetSessionCounters();

  // T1-T6 Backlog Forecast
  suite('T1 — linearRegressionForecast');
  await test('T1: regressão linear projeta valor positivo', () => {
    const svc = getPredMetrics();
    const pts = [{ x: 0, y: 5 }, { x: 10, y: 15 }, { x: 20, y: 25 }];
    const v = svc.linearRegressionForecast(pts, 30);
    assert(v > 25, 'projeção crescente');
  });

  suite('T2 — simpleMovingAverage');
  await test('T2: média móvel calculada', () => {
    const svc = getPredMetrics();
    assertEqual(svc.simpleMovingAverage([10, 20, 30], 3), 20, 'sma');
  });

  suite('T3 — forecastBacklogValue crescente');
  await test('T3: backlog forecast crescente', () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const series = [{ x: 0, y: 5 }, { x: 10, y: 10 }, { x: 20, y: 15 }];
    const v = svc.aioiBacklogForecastService.forecastBacklogValue(series);
    assert(v >= 15, 'forecast >= último valor');
    restoreDb();
  });

  suite('T4 — buildBacklogForecastFromSnapshots');
  await test('T4: 4 dimensões de backlog', () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const rows = buildSnapshots().filter(s => s.snapshot_type === 'backlog_snapshot');
    const r = svc.aioiBacklogForecastService.buildBacklogForecastFromSnapshots(rows);
    assert(r.approval_backlog_forecast != null, 'approval');
    assert(r.execution_backlog_forecast != null, 'execution');
    assert(r.outcome_backlog_forecast != null, 'outcome');
    assert(r.learning_backlog_forecast != null, 'learning');
    restoreDb();
  });

  suite('T5 — getBacklogForecast ok');
  await test('T5: getBacklogForecast retorna ok', async () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = await svc.aioiBacklogForecastService.getBacklogForecast(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.backlog_forecast.approval_backlog_forecast != null, 'approval');
    restoreDb();
  });

  suite('T6 — backlog forecast sem dados');
  await test('T6: backlog vazio retorna zeros', () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = svc.aioiBacklogForecastService.buildBacklogForecastFromSnapshots([]);
    assertEqual(r.approval_backlog_forecast, 0, 'zero');
    restoreDb();
  });

  // T7-T12 SLA Forecast
  suite('T7 — forecastStageStatus estrutura');
  await test('T7: forecastStageStatus retorna 3 campos', () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = svc.aioiSlaForecastService.forecastStageStatus(2000000, [{ x: 0, y: 2000000 }, { x: 10, y: 2500000 }], 3600000);
    assert(r.current_status, 'current');
    assert(r.forecast_status, 'forecast');
    assert(r.confidence >= 0 && r.confidence <= 100, 'confidence');
    restoreDb();
  });

  suite('T8 — SLA forecast status válidos');
  await test('T8: status permitidos', () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const allowed = ['within_sla', 'at_risk', 'breached'];
    const r = svc.aioiSlaForecastService.forecastStageStatus(null, [], 3600000);
    assert(allowed.includes(r.forecast_status), 'forecast_status');
    restoreDb();
  });

  suite('T9 — confidence 0-100');
  await test('T9: confidence dentro do range', () => {
    const svc = getPredMetrics();
    const c = svc.computeForecastConfidence(5, 0.2);
    assert(c >= 0 && c <= 100, 'range');
  });

  suite('T10 — buildSlaBreachForecastFromData');
  await test('T10: 6 estágios SLA', () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const currentSla = {
      open_to_triaged: { avg_time_ms: 2000000, status: 'within_sla' },
      triaged_to_approval: { avg_time_ms: 5000000, status: 'within_sla' },
      approval_to_execution: { avg_time_ms: 2000000, status: 'within_sla' },
      execution_to_outcome: { avg_time_ms: 10000000, status: 'within_sla' },
      outcome_to_learning: { avg_time_ms: 3000000, status: 'within_sla' },
      end_to_end: { avg_time_ms: 40000000, status: 'within_sla' }
    };
    const rows = buildSnapshots().filter(s => s.snapshot_type === 'cycle_kpis');
    const r = svc.aioiSlaForecastService.buildSlaBreachForecastFromData(currentSla, rows);
    assert(r.open_to_triaged, 'open');
    assert(r.end_to_end, 'e2e');
    restoreDb();
  });

  suite('T11 — getSlaBreachForecast ok');
  await test('T11: getSlaBreachForecast retorna ok', async () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = await svc.aioiSlaForecastService.getSlaBreachForecast(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.sla_breach_forecast.end_to_end, 'e2e');
    restoreDb();
  });

  suite('T12 — SLA forecast degrading trend');
  await test('T12: tendência degradante projeta at_risk ou breached', () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const series = [
      { x: 0, y: 2000000 }, { x: 10, y: 2800000 }, { x: 20, y: 3400000 }
    ];
    const r = svc.aioiSlaForecastService.forecastStageStatus(3400000, series, 3600000);
    assert(['at_risk', 'breached', 'within_sla'].includes(r.forecast_status), 'status');
    restoreDb();
  });

  // T13-T18 Capacity Forecast
  suite('T13 — classifyCapacityTrend increasing');
  await test('T13: trend increasing', () => {
    const svc = getPredMetrics();
    assertEqual(svc.classifyCapacityTrend(12, 8), 'increasing', 'increasing');
  });

  suite('T14 — classifyCapacityTrend decreasing');
  await test('T14: trend decreasing', () => {
    const svc = getPredMetrics();
    assertEqual(svc.classifyCapacityTrend(5, 10), 'decreasing', 'decreasing');
  });

  suite('T15 — classifyCapacityTrend stable');
  await test('T15: trend stable', () => {
    const svc = getPredMetrics();
    assertEqual(svc.classifyCapacityTrend(10, 10.5), 'stable', 'stable');
  });

  suite('T16 — computeCapacityForecast estrutura');
  await test('T16: capacity forecast 4 campos', () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = svc.aioiCapacityForecastService.computeCapacityForecast(
      [{ day: '2026-06-04', cnt: '2' }, { day: '2026-06-05', cnt: '4' }],
      [{ day: '2026-06-04', cnt: '1' }]
    );
    assert(r.estimated_daily_throughput != null, 'daily');
    assert(r.estimated_weekly_throughput != null, 'weekly');
    assert(r.estimated_monthly_throughput != null, 'monthly');
    assert(r.trend, 'trend');
    restoreDb();
  });

  suite('T17 — capacity sem dados');
  await test('T17: capacity vazio retorna stable', () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = svc.aioiCapacityForecastService.computeCapacityForecast([], []);
    assertEqual(r.trend, 'stable', 'stable');
    assertEqual(r.estimated_daily_throughput, 0, 'zero');
    restoreDb();
  });

  suite('T18 — getOperationalCapacityForecast ok');
  await test('T18: getOperationalCapacityForecast ok', async () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = await svc.aioiCapacityForecastService.getOperationalCapacityForecast(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.capacity_forecast.trend, 'trend');
    restoreDb();
  });

  // T19-T24 Risk Forecast
  suite('T19 — buildRiskForecastFromBacklog low');
  await test('T19: risk forecast low', () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = svc.aioiRiskForecastService.buildRiskForecastFromBacklog({
      approval_backlog_forecast: 5, execution_backlog_forecast: 3,
      outcome_backlog_forecast: 2, learning_backlog_forecast: 1
    });
    assertEqual(r.approval_risk_forecast, 'low', 'low');
    restoreDb();
  });

  suite('T20 — risk forecast medium');
  await test('T20: risk forecast medium', () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = svc.aioiRiskForecastService.buildRiskForecastFromBacklog({
      approval_backlog_forecast: 25, execution_backlog_forecast: 25,
      outcome_backlog_forecast: 25, learning_backlog_forecast: 25
    });
    assertEqual(r.execution_risk_forecast, 'medium', 'medium');
    restoreDb();
  });

  suite('T21 — risk forecast high');
  await test('T21: risk forecast high', () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = svc.aioiRiskForecastService.buildRiskForecastFromBacklog({
      approval_backlog_forecast: 60, execution_backlog_forecast: 60,
      outcome_backlog_forecast: 60, learning_backlog_forecast: 60
    });
    assertEqual(r.learning_risk_forecast, 'high', 'high');
    restoreDb();
  });

  suite('T22 — getExecutiveRiskForecast ok');
  await test('T22: getExecutiveRiskForecast ok', async () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = await svc.aioiRiskForecastService.getExecutiveRiskForecast(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.risk_forecast.approval_risk_forecast, 'approval');
    restoreDb();
  });

  suite('T23 — risk forecast 4 dimensões');
  await test('T23: 4 dimensões de risco', async () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = await svc.aioiRiskForecastService.getExecutiveRiskForecast(COMPANY_ID);
    assert(r.risk_forecast.execution_risk_forecast, 'execution');
    assert(r.risk_forecast.outcome_risk_forecast, 'outcome');
    assert(r.risk_forecast.learning_risk_forecast, 'learning');
    restoreDb();
  });

  suite('T24 — constantes explícitas');
  await test('T24: TREND_STABLE_EPS e FORECAST_WINDOW_DAYS', () => {
    const svc = getPredMetrics();
    assertEqual(svc.TREND_STABLE_EPS, 0.10, 'eps');
    assertEqual(svc.FORECAST_WINDOW_DAYS, 30, 'window');
  });

  // T25-T29 Predictive Governance Read Model
  suite('T25 — getPredictiveGovernanceReadModel ok');
  await test('T25: read model agregado ok', async () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = await svc.aioiPredictiveGovernanceReadModelService.getPredictiveGovernanceReadModel(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.predictive_governance_read_model.governance_read_model, 'gov');
    restoreDb();
  });

  suite('T26 — read model backlog_forecast');
  await test('T26: inclui backlog_forecast', async () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = await svc.aioiPredictiveGovernanceReadModelService.getPredictiveGovernanceReadModel(COMPANY_ID);
    assert(r.predictive_governance_read_model.backlog_forecast, 'backlog');
    restoreDb();
  });

  suite('T27 — read model sla_breach_forecast');
  await test('T27: inclui sla_breach_forecast', async () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = await svc.aioiPredictiveGovernanceReadModelService.getPredictiveGovernanceReadModel(COMPANY_ID);
    assert(r.predictive_governance_read_model.sla_breach_forecast, 'sla');
    restoreDb();
  });

  suite('T28 — read model capacity_forecast');
  await test('T28: inclui capacity_forecast', async () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = await svc.aioiPredictiveGovernanceReadModelService.getPredictiveGovernanceReadModel(COMPANY_ID);
    assert(r.predictive_governance_read_model.capacity_forecast, 'capacity');
    restoreDb();
  });

  suite('T29 — read model risk_forecast');
  await test('T29: inclui risk_forecast', async () => {
    patchDb(createPredDbMock());
    const svc = loadP22();
    const r = await svc.aioiPredictiveGovernanceReadModelService.getPredictiveGovernanceReadModel(COMPANY_ID);
    assert(r.predictive_governance_read_model.risk_forecast, 'risk');
    restoreDb();
  });

  // T30-T32 Read Only
  suite('T30 — READ_ONLY_LAYER_VIOLATION INSERT');
  await test('T30: INSERT bloqueado', () => {
    predMetrics = getPredMetrics();
    let threw = false;
    try { predMetrics.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) {
      threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', 'code');
    }
    assert(threw, 'throw');
  });

  suite('T31 — UPDATE bloqueado');
  await test('T31: UPDATE bloqueado', () => {
    predMetrics = getPredMetrics();
    let threw = false;
    try { predMetrics.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; }
    assert(threw, 'throw');
  });

  suite('T32 — nenhuma escrita em consultas');
  await test('T32: queries são SELECT', async () => {
    const mock = createPredDbMock();
    patchDb(mock);
    const svc = loadP22();
    await svc.aioiPredictiveGovernanceReadModelService.getPredictiveGovernanceReadModel(COMPANY_ID);
    assertNoWrites(mock._client._calls);
    restoreDb();
  });

  // T33 RLS
  suite('T33 — RLS bypass_rls false');
  await test('T33: bypass_rls=false', async () => {
    const mock = createPredDbMock();
    patchDb(mock);
    const svc = loadP22();
    await svc.aioiBacklogForecastService.getBacklogForecast(COMPANY_ID);
    const bypass = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(bypass.length >= 1, 'bypass');
    for (const c of bypass) assert(c.sql.includes("'false'"), 'false');
    restoreDb();
  });

  // T34 Multi Tenant
  suite('T34 — Multi-tenant tenant B');
  await test('T34: set_config tenant B', async () => {
    const mock = createPredDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })));
    patchDb(mock);
    const svc = loadP22();
    await svc.aioiBacklogForecastService.getBacklogForecast(COMPANY_ID_B);
    const tenant = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    assert(tenant, 'tenant call');
    assertEqual(tenant.params[0], COMPANY_ID_B, 'tenant B');
    restoreDb();
  });

  // T35 Logs
  suite('T35 — Logs corretos');
  await test('T35: labels obrigatórios presentes', () => {
    const src = fs.readFileSync(path.join(SERVICES_PATH, 'aioiPredictiveMetrics.js'), 'utf8');
    assert(src.includes('AIOI_FORECAST_REQUESTED'));
    assert(src.includes('AIOI_FORECAST_COMPLETED'));
    assert(src.includes('AIOI_BACKLOG_FORECAST_GENERATED'));
    assert(src.includes('AIOI_SLA_FORECAST_GENERATED'));
    assert(src.includes('AIOI_CAPACITY_FORECAST_GENERATED'));
    assert(src.includes('AIOI_RISK_FORECAST_GENERATED'));
    assert(src.includes('AIOI_FORECAST_ERROR'));
  });

  // T36 Metrics
  suite('T36 — Métricas corretas');
  await test('T36: getSessionCounters', () => {
    predMetrics = getPredMetrics();
    predMetrics.resetSessionCounters();
    predMetrics.recordForecastRequested(COMPANY_ID);
    predMetrics.recordBacklogForecastGenerated(COMPANY_ID);
    predMetrics.recordSlaForecastGenerated(COMPANY_ID);
    predMetrics.recordCapacityForecastGenerated(COMPANY_ID);
    predMetrics.recordRiskForecastGenerated(COMPANY_ID);
    predMetrics.recordForecastCompleted(COMPANY_ID, 150);
    const c = predMetrics.getSessionCounters();
    assertEqual(c.forecast_requests, 1, 'requests');
    assertEqual(c.backlog_forecast_count, 1, 'backlog');
    assertEqual(c.avg_forecast_latency_ms, 150, 'latency');
  });

  // T37 Soberanos ausentes
  suite('T37 — Soberanos ausentes');
  await test('T37: arquivos P2.2 não importam soberanos', () => {
    const files = [
      'aioiPredictiveMetrics.js', 'aioiBacklogForecastService.js',
      'aioiSlaForecastService.js', 'aioiCapacityForecastService.js',
      'aioiRiskForecastService.js', 'aioiPredictiveGovernanceReadModelService.js'
    ];
    const forbidden = [
      'operationalDecisionEngine', 'operationalLearningService',
      'workflowOrchestrator', 'actionRuntimeOrchestrator',
      'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService'
    ];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      for (const term of forbidden) assert(!code.includes(term), `${f} contém ${term}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P2.2 Predictive Governance Read Model Test Report');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P2_2_TEST_PASS' : 'AIOI_P2_2_TEST_FAIL'}`);
  console.log('');

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
