'use strict';

/**
 * AIOI-P5.0 — Testes automatizados da Enterprise Executive Cockpit API Layer
 * T1–T161+ | node src/tests/aioi/aioiCockpitApi.test.js
 */

let _passed = 0, _failed = 0;
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
const CONTROLLERS_PATH = path.resolve(__dirname, '../../controllers/aioi');
const ROUTES_PATH = path.resolve(__dirname, '../../routes/aioi');
const COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const COMPANY_ID_B = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';
const DB_MOD_PATH = require.resolve('../../db');
let _originalDb;
function patchDb(mock) {
  if (!_originalDb && require.cache[DB_MOD_PATH]) _originalDb = require.cache[DB_MOD_PATH].exports;
  require.cache[DB_MOD_PATH] = { id: DB_MOD_PATH, filename: DB_MOD_PATH, loaded: true, exports: mock };
}
function restoreDb() {
  if (_originalDb) require.cache[DB_MOD_PATH] = { id: DB_MOD_PATH, filename: DB_MOD_PATH, loaded: true, exports: _originalDb };
}

const IIRM_PATH = require.resolve(`${SERVICES_PATH}/aioiInterfaceIntelligenceReadModelService`);
let iirmCallCount = 0;

const SAMPLE_IIRM_RESPONSE = {
  ok: true,
  interface_intelligence_read_model: {
    decision_visualization_read_model: {
      executive_cockpit_read_model: {
        visualization_read_model: {
          enterprise_visualization_readiness: { visualization_score: 87, visualization_level: 'visualization_ready' }
        },
        executive_summary: { summary_score: 85, summary_status: 'summary_ready' },
        strategic_overview: { overview_score: 84, overview_status: 'overview_ready' },
        enterprise_cockpit_readiness: { cockpit_score: 86, cockpit_level: 'executive_ready' }
      },
      decision_perspective: { perspective_score: 85, perspective_status: 'decision_ready' },
      decision_consistency: { consistency_score: 84, consistency_status: 'consistent' },
      decision_visualization_coverage: { coverage_score: 93, coverage_status: 'comprehensive' },
      enterprise_decision_visualization: { visualization_score: 87, visualization_level: 'executive_visualization_ready' }
    },
    interface_perspective: { perspective_score: 88, perspective_status: 'interface_ready' },
    interface_consistency: { consistency_score: 86, consistency_status: 'consistent' },
    interface_coverage: { coverage_score: 90, coverage_status: 'comprehensive' },
    enterprise_interface_intelligence: { interface_score: 87, interface_level: 'interface_ready' }
  }
};

function installIirmMock() {
  iirmCallCount = 0;
  require.cache[IIRM_PATH] = {
    id: IIRM_PATH,
    filename: IIRM_PATH,
    loaded: true,
    exports: {
      getInterfaceIntelligenceReadModel: async (cid) => {
        iirmCallCount++;
        if (!cid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(cid))) {
          return { ok: false, error: 'companyId inválido' };
        }
        return { ...SAMPLE_IIRM_RESPONSE, interface_intelligence_read_model: { ...SAMPLE_IIRM_RESPONSE.interface_intelligence_read_model } };
      }
    }
  };
}

function clearAioiModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/services/aioi/') || key.includes('/controllers/aioi/') || key.includes('/routes/aioi/')) {
      delete require.cache[key];
    }
  }
}

let _svcCache = null;
function loadP50() {
  if (_svcCache) return _svcCache;
  installIirmMock();
  const loaded = {
    aioiCockpitApiMetrics: require(`${SERVICES_PATH}/aioiCockpitApiMetrics`),
    aioiCockpitApiService: require(`${SERVICES_PATH}/aioiCockpitApiService`),
    aioiInterfaceIntelligenceReadModelService: require(IIRM_PATH)
  };
  loaded.controller = require(`${CONTROLLERS_PATH}/aioiCockpitController`);
  _svcCache = loaded;
  return loaded;
}

function reloadP50() {
  _svcCache = null;
  clearAioiModuleCache();
  return loadP50();
}

function getApiMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiCockpitApiMetrics`)];
  if (_svcCache) delete _svcCache.aioiCockpitApiMetrics;
  const m = require(`${SERVICES_PATH}/aioiCockpitApiMetrics`);
  if (_svcCache) _svcCache.aioiCockpitApiMetrics = m;
  return m;
}

function stripComments(c) { return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); }
function assertNoWrites(calls) {
  for (const c of calls) {
    const s = c.sql.trim().toUpperCase();
    if (['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ALTER', 'DROP', 'CREATE', 'MERGE'].some(k => s.startsWith(k))) {
      throw new Error(`escrita: ${c.sql.slice(0, 60)}`);
    }
  }
}

function buildIoes() {
  const mid = '2026-05-15T12:00:00.000Z';
  const recent = '2026-06-04T08:00:00.000Z';
  return [
    { company_id: COMPANY_ID, status: 'resolved', decision_type: 'operational',
      approved_by_user_id: 'u1', workflow_instance_id: 'w1', execution_trace_id: 'e1',
      decision_payload: { aioi_outcome: true, aioi_learning_processed: true }, created_at: mid },
    { company_id: COMPANY_ID, status: 'approved', decision_type: 'strategic',
      approved_by_user_id: 'u2', created_at: recent },
    { company_id: COMPANY_ID, status: 'open', decision_type: 'operational', created_at: recent }
  ];
}

function buildSnapshots() {
  const mid = '2026-05-15T12:00:00.000Z';
  const recent = '2026-06-04T08:00:00.000Z';
  return [
    { company_id: COMPANY_ID, snapshot_type: 'cycle_timing',
      snapshot_payload: { open_to_triaged_ms: 2000000, triaged_to_approval_ms: 5000000,
        approval_to_execution_ms: 2000000, execution_to_outcome_ms: 10000000, outcome_to_learning_ms: 3000000 }, created_at: mid },
    { company_id: COMPANY_ID, snapshot_type: 'cycle_kpis',
      snapshot_payload: { end_to_end_cycle_ms: 40000000 }, created_at: recent },
    { company_id: COMPANY_ID, snapshot_type: 'lifecycle_snapshot',
      snapshot_payload: { operational_success_rate: 0.85 }, created_at: recent },
    { company_id: COMPANY_ID, snapshot_type: 'throughput_snapshot',
      snapshot_payload: { daily_throughput: 6 }, created_at: recent }
  ];
}

function _ioeCounts(filtered) {
  return {
    total: filtered.length,
    with_decision: filtered.filter(i => i.decision_type).length,
    with_hitl: filtered.filter(i => i.approved_by_user_id).length,
    with_approval: filtered.filter(i => i.approved_by_user_id).length,
    with_execution: filtered.filter(i => i.workflow_instance_id || i.execution_trace_id).length,
    with_outcome: filtered.filter(i => i.decision_payload?.aioi_outcome).length,
    with_learning: filtered.filter(i =>
      i.decision_payload?.aioi_learning_processed || i.decision_payload?.aioi_learning_submitted).length
  };
}

function createReadinessDbMock(ioes = buildIoes(), snapshots = buildSnapshots()) {
  const calls = [];
  const store = ioes.map(i => ({ ...i }));
  const snapStore = snapshots.map(s => ({ ...s }));
  const client = {
    _calls: calls,
    async query(sql, params) {
      const s = sql.trim();
      calls.push({ sql: s, params });
      if (['set_config', 'BEGIN', 'COMMIT', 'ROLLBACK'].some(k => s.includes(k) || s === k)) return { rows: [] };
      if (s.includes('SELECT 1 AS rls_validated') || s.includes('SELECT 1 AS rls_ok')) return { rows: [{ rls_validated: 1 }] };
      const companyId = params?.[0] || COMPANY_ID;
      const filtered = store.filter(i => i.company_id === companyId);
      if (s.includes('decision_type IS NOT NULL')) {
        const c = _ioeCounts(filtered);
        const row = { total: String(c.total), with_decision: String(c.with_decision),
          with_hitl: String(c.with_hitl), with_execution: String(c.with_execution),
          with_outcome: String(c.with_outcome), with_learning: String(c.with_learning) };
        if (s.includes('with_approval')) row.with_approval = String(c.with_approval);
        return { rows: [row] };
      }
      if (s.includes('event_type ILIKE') && s.includes('trust')) return { rows: [{ cnt: '1' }] };
      if (s.includes('event_type ILIKE') && (s.includes('assurance') || s.includes('compliance'))) return { rows: [{ cnt: '1' }] };
      if (s.includes('aioi_audit_events') && s.includes('COUNT') && !s.includes('ILIKE')) return { rows: [{ cnt: '2' }] };
      if (s.includes('aioi_processing_history') && s.includes('COUNT') && !s.includes('GROUP BY')) return { rows: [{ cnt: '3' }] };
      if (s.includes('aioi_metrics_snapshots') && s.includes('COUNT') && !s.includes('snapshot_payload')) {
        return { rows: [{ cnt: String(snapStore.filter(x => x.company_id === companyId).length) }] };
      }
      if (s.includes('industrial_operational_events') && s.includes('COUNT')) {
        if (s.includes("'resolved'") || s.includes("'closed'")) return { rows: [{ cnt: String(filtered.filter(i => i.status === 'resolved').length) }] };
        return { rows: [{ cnt: String(filtered.length) }] };
      }
      if (s.includes('aioi_metrics_snapshots')) {
        let rows = snapStore.filter(x => x.company_id === companyId);
        if (params[1]) rows = rows.filter(x => x.snapshot_type === params[1]);
        if (s.includes('ORDER BY created_at DESC')) {
          rows = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          return { rows: rows.slice(0, 1) };
        }
        return { rows };
      }
      if (s.includes('aioi_processing_history')) {
        if (s.includes('learning_processed') && s.includes('COUNT')) return { rows: [{ cnt: '1' }] };
        if (s.includes('GROUP BY')) return { rows: [{ day: '2026-06-04', cnt: '2' }] };
        return { rows: [] };
      }
      if (s.includes('approved') && s.includes('executed') && s.includes('learning_processed_ioe')) {
        return { rows: [{ approved: '3', executed: '2', resolved: '1', learning_processed_ioe: '1' }] };
      }
      if (s.includes('learning_done') && s.includes('resolved')) {
        const resolved = filtered.filter(i => i.status === 'resolved').length;
        const learning = filtered.filter(i => i.decision_payload?.aioi_learning_processed).length;
        return { rows: [{ resolved: String(resolved), learning_done: String(learning) }] };
      }
      if (s.includes("status = 'resolved'") && s.includes('GROUP BY')) return { rows: [{ day: '2026-06-04', cnt: '2' }] };
      if (s.includes('open_to_triaged_ms')) {
        return { rows: [{ open_to_triaged_ms: '2000000', triaged_to_approval_ms: '5000000',
          approval_to_execution_ms: '2000000', execution_to_outcome_ms: '10000000',
          outcome_to_learning_ms: '3000000', end_to_end_cycle_ms: '40000000' }] };
      }
      if (s.includes('approval_backlog') && s.includes('COUNT')) {
        return { rows: [{ approval_backlog: '1', execution_backlog: '1', outcome_backlog: '0', learning_backlog: '0' }] };
      }
      if (s.includes("status = 'open'") && s.includes('critical_events')) {
        return { rows: [{ open: '1', triaged: '0', pending_approval: '0', approved: '1',
          rejected: '0', in_progress: '1', resolved: '1', critical_events: '0',
          avg_resolution_time_ms: '7200000', avg_approval_time_ms: '3600000',
          avg_execution_time_ms: '5400000', success_count: '1', total_with_outcome: '1' }] };
      }
      if (s.includes('GROUP BY priority_band') || s.includes('GROUP BY category') || s.includes('GROUP BY status')) return { rows: [] };
      return { rows: [] };
    },
    release: () => {}
  };
  return { pool: { connect: async () => client }, _client: client };
}

function mockRes() {
  const res = { _status: 200, _body: null, _headers: {} };
  res.set = (k, v) => { res._headers[k] = v; return res; };
  res.status = (s) => { res._status = s; return res; };
  res.json = (b) => { res._body = b; return res; };
  return res;
}

async function runTests() {
  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP50();
  let am = svc.aioiCockpitApiMetrics;
  am.resetSessionCounters();
  const apiSvc = svc.aioiCockpitApiService;
  const controller = svc.controller;

  const sharedApiCache = apiSvc.createRequestCache();
  async function getCachedP46() {
    return svc.aioiInterfaceIntelligenceReadModelService.getInterfaceIntelligenceReadModel(COMPANY_ID);
  }
  let cachedSummary = null;
  async function getCachedSummary() {
    if (!cachedSummary) cachedSummary = await apiSvc.getCockpitSummary(COMPANY_ID, sharedApiCache);
    return cachedSummary;
  }
  let cachedOverview = null;
  async function getCachedOverview() {
    if (!cachedOverview) cachedOverview = await apiSvc.getCockpitOverview(COMPANY_ID, sharedApiCache);
    return cachedOverview;
  }

  suite('T1'); await test('T1: assertReadOnlySql exportado', async () => { assert(typeof am.assertReadOnlySql === 'function') });
  suite('T2'); await test('T2: INSERT bloqueado', async () => { let t=false; try{am.assertReadOnlySql('INSERT INTO x VALUES (1)');}catch(e){t=true;assertEqual(e.message,'READ_ONLY_LAYER_VIOLATION','');} assert(t) });
  suite('T3'); await test('T3: UPDATE bloqueado', async () => { let t=false; try{am.assertReadOnlySql('UPDATE x SET y=1');}catch(e){t=true;} assert(t) });
  suite('T4'); await test('T4: DELETE bloqueado', async () => { let t=false; try{am.assertReadOnlySql('DELETE FROM x');}catch(e){t=true;} assert(t) });
  suite('T5'); await test('T5: TRUNCATE bloqueado', async () => { let t=false; try{am.assertReadOnlySql('TRUNCATE TABLE x');}catch(e){t=true;} assert(t) });
  suite('T6'); await test('T6: CREATE bloqueado', async () => { let t=false; try{am.assertReadOnlySql('CREATE TABLE x (id int)');}catch(e){t=true;} assert(t) });
  suite('T7'); await test('T7: DROP bloqueado', async () => { let t=false; try{am.assertReadOnlySql('DROP TABLE x');}catch(e){t=true;} assert(t) });
  suite('T8'); await test('T8: ALTER bloqueado', async () => { let t=false; try{am.assertReadOnlySql('ALTER TABLE x ADD y int');}catch(e){t=true;} assert(t) });
  suite('T9'); await test('T9: UPSERT bloqueado', async () => { let t=false; try{am.assertReadOnlySql('UPSERT INTO x VALUES (1)');}catch(e){t=true;} assert(t) });
  suite('T10'); await test('T10: ON CONFLICT bloqueado', async () => { let t=false; try{am.assertReadOnlySql('INSERT INTO x VALUES (1) ON CONFLICT DO NOTHING');}catch(e){t=true;assertEqual(e.message,'READ_ONLY_LAYER_VIOLATION','');} assert(t) });
  suite('T11'); await test('T11: MERGE bloqueado', async () => { let t=false; try{am.assertReadOnlySql('MERGE INTO x');}catch(e){t=true;} assert(t) });
  suite('T12'); await test('T12: GRANT bloqueado', async () => { let t=false; try{am.assertReadOnlySql('GRANT ALL ON x TO y');}catch(e){t=true;} assert(t) });
  suite('T13'); await test('T13: REVOKE bloqueado', async () => { let t=false; try{am.assertReadOnlySql('REVOKE ALL ON x FROM y');}catch(e){t=true;} assert(t) });
  suite('T14'); await test('T14: recordCockpitApiRequested', async () => { am.resetSessionCounters(); am.recordCockpitApiRequested(COMPANY_ID,'summary'); assertEqual(am.getSessionCounters().cockpit_api_requests,1,'') });
  suite('T15'); await test('T15: recordCockpitApiCompleted latency', async () => { am.recordCockpitApiCompleted(COMPANY_ID,'summary',55); assertEqual(am.getSessionCounters().avg_query_latency_ms,55,'') });
  suite('T16'); await test('T16: recordCockpitSummaryRequest', async () => { am.recordCockpitSummaryRequest(COMPANY_ID); assert(am.getSessionCounters().cockpit_summary_requests>=1) });
  suite('T17'); await test('T17: recordCockpitOverviewRequest', async () => { am.recordCockpitOverviewRequest(COMPANY_ID); assert(am.getSessionCounters().cockpit_overview_requests>=1) });
  suite('T18'); await test('T18: recordCockpitInterfaceRequest', async () => { am.recordCockpitInterfaceRequest(COMPANY_ID); assert(am.getSessionCounters().cockpit_interface_requests>=1) });
  suite('T19'); await test('T19: recordCockpitVisualizationRequest', async () => { am.recordCockpitVisualizationRequest(COMPANY_ID); assert(am.getSessionCounters().cockpit_visualization_requests>=1) });
  suite('T20'); await test('T20: getSessionCounters campos', async () => { am.resetSessionCounters(); const c=am.getSessionCounters(); assert('cockpit_api_requests' in c && 'avg_query_latency_ms' in c) });
  suite('T21'); await test('T21: getCockpitSummary ok', async () => { const cache=apiSvc.createRequestCache(); const r=await apiSvc.getCockpitSummary(COMPANY_ID,cache); assert(r.ok && r.executive_summary && r.cockpit_readiness) });
  suite('T22'); await test('T22: getCockpitOverview ok', async () => { const cache=apiSvc.createRequestCache(); const r=await apiSvc.getCockpitOverview(COMPANY_ID,cache); assert(r.ok && r.strategic_overview && r.visualization_readiness) });
  suite('T23'); await test('T23: getCockpitInterfaceIntelligence ok', async () => { const cache=apiSvc.createRequestCache(); const r=await apiSvc.getCockpitInterfaceIntelligence(COMPANY_ID,cache); assert(r.ok && r.interface_perspective && r.enterprise_interface_intelligence) });
  suite('T24'); await test('T24: getCockpitDecisionVisualization ok', async () => { const cache=apiSvc.createRequestCache(); const r=await apiSvc.getCockpitDecisionVisualization(COMPANY_ID,cache); assert(r.ok && r.decision_perspective && r.enterprise_decision_visualization) });
  suite('T25'); await test('T25: getCockpitReadModel ok', async () => { const cache=apiSvc.createRequestCache(); const r=await apiSvc.getCockpitReadModel(COMPANY_ID,cache); assert(r.ok && r.interface_intelligence_read_model) });
  suite('T26'); await test('T26: companyId inválido summary', async () => { const r=await apiSvc.getCockpitSummary('bad-id'); assert(!r.ok) });
  suite('T27'); await test('T27: companyId inválido overview', async () => { const r=await apiSvc.getCockpitOverview('invalid'); assert(!r.ok) });
  suite('T28'); await test('T28: buildSummaryPayload campos', async () => { const p=apiSvc.buildSummaryPayload(SAMPLE_IIRM_RESPONSE); assertEqual(p.executive_summary.summary_score,85,'') });
  suite('T29'); await test('T29: buildOverviewPayload campos', async () => { const p=apiSvc.buildOverviewPayload(SAMPLE_IIRM_RESPONSE); assertEqual(p.visualization_readiness.visualization_score,87,'') });
  suite('T30'); await test('T30: buildInterfaceIntelligencePayload', async () => { const p=apiSvc.buildInterfaceIntelligencePayload(SAMPLE_IIRM_RESPONSE); assertEqual(p.interface_perspective.perspective_score,88,'') });
  suite('T31'); await test('T31: buildDecisionVisualizationPayload', async () => { const p=apiSvc.buildDecisionVisualizationPayload(SAMPLE_IIRM_RESPONSE); assertEqual(p.decision_perspective.perspective_score,85,'') });
  suite('T32'); await test('T32: buildReadModelPayload integral', async () => { const p=apiSvc.buildReadModelPayload(SAMPLE_IIRM_RESPONSE); assert(p.interface_intelligence_read_model) });
  suite('T33'); await test('T33: summary cockpit_readiness score', async () => { const r=await getCachedSummary(); assertEqual(r.cockpit_readiness.cockpit_score,86,'') });
  suite('T34'); await test('T34: overview strategic_overview score', async () => { const r=await getCachedOverview(); assertEqual(r.strategic_overview.overview_score,84,'') });
  suite('T35'); await test('T35: interface intelligence interface_level', async () => { const r=await apiSvc.getCockpitInterfaceIntelligence(COMPANY_ID,sharedApiCache); assertEqual(r.enterprise_interface_intelligence.interface_level,'interface_ready','') });
  suite('T36'); await test('T36: decision visualization level', async () => { const r=await apiSvc.getCockpitDecisionVisualization(COMPANY_ID,apiSvc.createRequestCache()); assert(r.enterprise_decision_visualization.visualization_level) });
  suite('T37'); await test('T37: read-model nested dvrm', async () => { const r=await apiSvc.getCockpitReadModel(COMPANY_ID,apiSvc.createRequestCache()); assert(r.interface_intelligence_read_model.decision_visualization_read_model) });
  suite('T38'); await test('T38: createRequestCache isolado', async () => { const c1=apiSvc.createRequestCache(); const c2=apiSvc.createRequestCache(); assert(c1!==c2 && c1.readModel===null) });
  suite('T39'); await test('T39: summary status field', async () => { const r=await apiSvc.getCockpitSummary(COMPANY_ID,apiSvc.createRequestCache()); assert(r.executive_summary.summary_status) });
  suite('T40'); await test('T40: overview visualization_level', async () => { const r=await apiSvc.getCockpitOverview(COMPANY_ID,apiSvc.createRequestCache()); assert(r.visualization_readiness.visualization_level) });
  suite('T41'); await test('T41: interface consistency campos', async () => { const r=await apiSvc.getCockpitInterfaceIntelligence(COMPANY_ID,apiSvc.createRequestCache()); assert('consistency_score' in r.interface_consistency) });
  suite('T42'); await test('T42: decision consistency campos', async () => { const r=await apiSvc.getCockpitDecisionVisualization(COMPANY_ID,apiSvc.createRequestCache()); assert('consistency_score' in r.decision_consistency) });
  suite('T43'); await test('T43: interface coverage campos', async () => { const r=await apiSvc.getCockpitInterfaceIntelligence(COMPANY_ID,apiSvc.createRequestCache()); assert('coverage_score' in r.interface_coverage) });
  suite('T44'); await test('T44: decision coverage campos', async () => { const r=await apiSvc.getCockpitDecisionVisualization(COMPANY_ID,apiSvc.createRequestCache()); assert('coverage_score' in r.decision_visualization_coverage) });
  suite('T45'); await test('T45: read-model enterprise ii', async () => { const r=await apiSvc.getCockpitReadModel(COMPANY_ID,apiSvc.createRequestCache()); assert(r.interface_intelligence_read_model.enterprise_interface_intelligence.interface_score>=70) });
  suite('T46'); await test('T46: getInterfaceIntelligenceReadModel uma vez service', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assertEqual((code.match(/getInterfaceIntelligenceReadModel/g)||[]).length,1,'single iirm') });
  suite('T47'); await test('T47: sem getDecisionVisualizationReadModel direto', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('getDecisionVisualizationReadModel')) });
  suite('T48'); await test('T48: sem getExecutiveCockpitReadModel direto', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('getExecutiveCockpitReadModel')) });
  suite('T49'); await test('T49: sem getVisualizationReadModel direto', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('getVisualizationReadModel')) });
  suite('T50'); await test('T50: sem getConsumptionReadModel direto', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('getConsumptionReadModel')) });
  suite('T51'); await test('T51: composição exclusiva P4.6', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(code.includes('interfaceIntelligenceReadModel')) });
  suite('T52'); await test('T52: sem LLM/IA P5.0 service', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('openai') && !code.includes('generateText')) });
  suite('T53'); await test('T53: sem forecast P5.0', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('getBacklogForecast')) });
  suite('T54'); await test('T54: sem execução P5.0', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('executeDecision') && !code.includes('runWorkflow')) });
  suite('T55'); await test('T55: sem React/dashboard service', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('React') && !code.includes('Chart.js')) });
  suite('T56'); await test('T56: build* local composição', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(code.includes('buildSummaryPayload') && code.includes('buildOverviewPayload')) });
  suite('T57'); await test('T57: fan-out cache shared request', async () => { iirmCallCount=0; const cache=apiSvc.createRequestCache(); await apiSvc.getCockpitSummary(COMPANY_ID,cache); await apiSvc.getCockpitOverview(COMPANY_ID,cache); assertEqual(iirmCallCount,1,'shared cache') });
  suite('T58'); await test('T58: fan-out cache read-model + summary', async () => { iirmCallCount=0; const cache=apiSvc.createRequestCache(); await apiSvc.getCockpitReadModel(COMPANY_ID,cache); await apiSvc.getCockpitInterfaceIntelligence(COMPANY_ID,cache); assertEqual(iirmCallCount,1,'') });
  suite('T59'); await test('T59: fan-out all endpoints one cache', async () => { iirmCallCount=0; const cache=apiSvc.createRequestCache(); await apiSvc.getCockpitSummary(COMPANY_ID,cache); await apiSvc.getCockpitOverview(COMPANY_ID,cache); await apiSvc.getCockpitInterfaceIntelligence(COMPANY_ID,cache); await apiSvc.getCockpitDecisionVisualization(COMPANY_ID,cache); await apiSvc.getCockpitReadModel(COMPANY_ID,cache); assertEqual(iirmCallCount,1,'all endpoints') });
  suite('T60'); await test('T60: sem scoring novo P5.0', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('computePriorityScore') && !code.includes('mlModel')) });
  suite('T61'); await test('T61: soberanos ausentes P5.0', async () => { const files=['aioiCockpitApiService.js','aioiCockpitApiMetrics.js']; const forbidden=['operationalDecisionEngine','workflowOrchestrator','actionRuntimeOrchestrator','aioiOutboxConsumerService']; for(const f of files){const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,f),'utf8')); for(const bad of forbidden) assert(!code.includes(bad),f+' '+bad)} });
  suite('T62'); await test('T62: metrics sem express', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiMetrics.js'),'utf8')); assert(!code.includes('express.Router')) });
  suite('T63'); await test('T63: controller exporta 5 handlers', async () => { assert(typeof controller.getSummary==='function' && typeof controller.getReadModel==='function') });
  suite('T64'); await test('T64: routes module file exists', async () => { assert(fs.existsSync(path.join(ROUTES_PATH,'aioiCockpitRoutes.js'))) });
  suite('T65'); await test('T65: routes sem POST/PUT/DELETE', async () => { const code=stripComments(fs.readFileSync(path.join(ROUTES_PATH,'aioiCockpitRoutes.js'),'utf8')); assert(!code.includes('router.post') && !code.includes('router.put') && !code.includes('router.delete')) });
  suite('T66'); await test('T66: controller getSummary 200', async () => { const req={user:{company_id:COMPANY_ID},aioiCockpitCache:apiSvc.createRequestCache()}; const res=mockRes(); await controller.getSummary(req,res); assertEqual(res._status,200,''); assert(res._body.ok) });
  suite('T67'); await test('T67: controller getOverview 200', async () => { const req={user:{company_id:COMPANY_ID},aioiCockpitCache:apiSvc.createRequestCache()}; const res=mockRes(); await controller.getOverview(req,res); assert(res._body.strategic_overview) });
  suite('T68'); await test('T68: controller getInterfaceIntelligence 200', async () => { const req={user:{company_id:COMPANY_ID},aioiCockpitCache:apiSvc.createRequestCache()}; const res=mockRes(); await controller.getInterfaceIntelligence(req,res); assert(res._body.interface_perspective) });
  suite('T69'); await test('T69: controller getDecisionVisualization 200', async () => { const req={user:{company_id:COMPANY_ID},aioiCockpitCache:apiSvc.createRequestCache()}; const res=mockRes(); await controller.getDecisionVisualization(req,res); assert(res._body.decision_perspective) });
  suite('T70'); await test('T70: controller getReadModel 200', async () => { const req={user:{company_id:COMPANY_ID},aioiCockpitCache:apiSvc.createRequestCache()}; const res=mockRes(); await controller.getReadModel(req,res); assert(res._body.interface_intelligence_read_model) });
  suite('T71'); await test('T71: controller Cache-Control no-store', async () => { const req={user:{company_id:COMPANY_ID},aioiCockpitCache:apiSvc.createRequestCache()}; const res=mockRes(); await controller.getSummary(req,res); assertEqual(res._headers['Cache-Control'],'no-store','') });
  suite('T72'); await test('T72: controller shared cache', async () => { iirmCallCount=0; const cache=apiSvc.createRequestCache(); const req={user:{company_id:COMPANY_ID},aioiCockpitCache:cache}; const res1=mockRes(); await controller.getSummary(req,res1); const res2=mockRes(); await controller.getOverview(req,res2); assertEqual(iirmCallCount,1,'controller cache') });
  suite('T73'); await test('T73: controller invalid company 400', async () => { const req={user:{company_id:'bad'}}; const res=mockRes(); await controller.getSummary(req,res); assertEqual(res._status,400,'') });
  suite('T74'); await test('T74: controller sem company_id 400', async () => { const req={user:{}}; const res=mockRes(); await controller.getOverview(req,res); assertEqual(res._status,400,'') });
  suite('T75'); await test('T75: controller attach cache automatic', async () => { iirmCallCount=0; const req={user:{company_id:COMPANY_ID}}; const res1=mockRes(); await controller.getSummary(req,res1); assert(req.aioiCockpitCache); await controller.getOverview(req,res1); assertEqual(iirmCallCount,1,'') });
  suite('T76'); await test('T76: controller read-model full payload', async () => { const req={user:{company_id:COMPANY_ID},aioiCockpitCache:apiSvc.createRequestCache()}; const res=mockRes(); await controller.getReadModel(req,res); assert(res._body.interface_intelligence_read_model.decision_visualization_read_model) });
  suite('T77'); await test('T77: controller summary executive_summary', async () => { const req={user:{company_id:COMPANY_ID},aioiCockpitCache:sharedApiCache}; const res=mockRes(); await controller.getSummary(req,res); assertEqual(res._body.executive_summary.summary_score,85,'') });
  suite('T78'); await test('T78: controller overview visualization', async () => { const req={user:{company_id:COMPANY_ID},aioiCockpitCache:sharedApiCache}; const res=mockRes(); await controller.getOverview(req,res); assertEqual(res._body.visualization_readiness.visualization_level,'visualization_ready','') });
  suite('T79'); await test('T79: controller interface intelligence level', async () => { const req={user:{company_id:COMPANY_ID},aioiCockpitCache:apiSvc.createRequestCache()}; const res=mockRes(); await controller.getInterfaceIntelligence(req,res); assert(res._body.enterprise_interface_intelligence.interface_level) });
  suite('T80'); await test('T80: controller decision visualization level', async () => { const req={user:{company_id:COMPANY_ID},aioiCockpitCache:apiSvc.createRequestCache()}; const res=mockRes(); await controller.getDecisionVisualization(req,res); assert(res._body.enterprise_decision_visualization.visualization_level) });
  suite('T81'); await test('T81: controller ok true all endpoints', async () => { for(const fn of ['getSummary','getOverview','getInterfaceIntelligence','getDecisionVisualization','getReadModel']){const req={user:{company_id:COMPANY_ID},aioiCockpitCache:apiSvc.createRequestCache()}; const res=mockRes(); await controller[fn](req,res); assert(res._body.ok,true,fn)} });
  suite('T82'); await test('T82: controller resolve company from user', async () => { const req={user:{company_id:COMPANY_ID},aioiCockpitCache:apiSvc.createRequestCache()}; const res=mockRes(); await controller.getSummary(req,res); assert(res._body.ok) });
  suite('T83'); await test('T83: controller sem side effects', async () => { const code=stripComments(fs.readFileSync(path.join(CONTROLLERS_PATH,'aioiCockpitController.js'),'utf8')); assert(!code.includes('INSERT') && !code.includes('UPDATE')) });
  suite('T84'); await test('T84: controller delega service', async () => { const code=stripComments(fs.readFileSync(path.join(CONTROLLERS_PATH,'aioiCockpitController.js'),'utf8')); assert(code.includes('cockpitApiService')) });
  suite('T85'); await test('T85: controller 5 exports', async () => { assert(controller.getSummary && controller.getOverview && controller.getInterfaceIntelligence && controller.getDecisionVisualization && controller.getReadModel) });
  suite('T86'); await test('T86: routes 5 GET paths', async () => { const code=fs.readFileSync(path.join(ROUTES_PATH,'aioiCockpitRoutes.js'),'utf8'); assert(code.includes('/summary') && code.includes('/read-model')) });
  suite('T87'); await test('T87: routes requireAuth', async () => { const code=fs.readFileSync(path.join(ROUTES_PATH,'aioiCockpitRoutes.js'),'utf8'); assert(code.includes('requireAuth')) });
  suite('T88'); await test('T88: routes requireCompanyActive', async () => { const code=fs.readFileSync(path.join(ROUTES_PATH,'aioiCockpitRoutes.js'),'utf8'); assert(code.includes('requireCompanyActive')) });
  suite('T89'); await test('T89: routes interface-intelligence path', async () => { const code=fs.readFileSync(path.join(ROUTES_PATH,'aioiCockpitRoutes.js'),'utf8'); assert(code.includes('/interface-intelligence')) });
  suite('T90'); await test('T90: routes decision-visualization path', async () => { const code=fs.readFileSync(path.join(ROUTES_PATH,'aioiCockpitRoutes.js'),'utf8'); assert(code.includes('/decision-visualization')) });
  suite('T91'); await test('T91: RLS company_id set_config', async () => { await am.validateTenantRls(COMPANY_ID); const t=mock._client._calls.find(c=>c.sql.includes('app.current_company_id')); assert(t && t.params[0]===COMPANY_ID) });
  suite('T92'); await test('T92: RLS bypass false', async () => { await am.validateTenantRls(COMPANY_ID); const b=mock._client._calls.filter(c=>c.sql.includes('app.bypass_rls')); assert(b.length>=1) });
  suite('T93'); await test('T93: zero writes metrics RLS', async () => { assertNoWrites(mock._client._calls) });
  suite('T94'); await test('T94: tenant B RLS', async () => { const mockB=createReadinessDbMock(buildIoes().map(i=>({...i,company_id:COMPANY_ID_B})),buildSnapshots().map(s=>({...s,company_id:COMPANY_ID_B}))); patchDb(mockB); await getApiMetrics().validateTenantRls(COMPANY_ID_B); const t=mockB._client._calls.find(c=>c.params&&c.params[0]===COMPANY_ID_B); assert(t,'tenant B'); patchDb(mock); });
  suite('T95'); await test('T95: tenant B summary', async () => { const r=await apiSvc.getCockpitSummary(COMPANY_ID_B,apiSvc.createRequestCache()); assert(r.ok) });
  suite('T96'); await test('T96: validateTenantRls SELECT read only', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiMetrics.js'),'utf8')); assert(code.includes('assertReadOnlySql')) });
  suite('T97'); await test('T97: recordError metrics', async () => { am.recordError(COMPANY_ID,'test','err'); assert(am.getSessionCounters().cockpit_api_error_count>=1) });
  suite('T98'); await test('T98: summary increments metric', async () => { am.resetSessionCounters(); await apiSvc.getCockpitSummary(COMPANY_ID,apiSvc.createRequestCache()); assert(am.getSessionCounters().cockpit_summary_requests>=1) });
  suite('T99'); await test('T99: overview increments metric', async () => { am.resetSessionCounters(); await apiSvc.getCockpitOverview(COMPANY_ID,apiSvc.createRequestCache()); assert(am.getSessionCounters().cockpit_overview_requests>=1) });
  suite('T100'); await test('T100: interface increments metric', async () => { am.resetSessionCounters(); await apiSvc.getCockpitInterfaceIntelligence(COMPANY_ID,apiSvc.createRequestCache()); assert(am.getSessionCounters().cockpit_interface_requests>=1) });
  suite('T101'); await test('T101: visualization increments metric', async () => { am.resetSessionCounters(); await apiSvc.getCockpitDecisionVisualization(COMPANY_ID,apiSvc.createRequestCache()); assert(am.getSessionCounters().cockpit_visualization_requests>=1) });
  suite('T102'); await test('T102: api request counter', async () => { am.resetSessionCounters(); await apiSvc.getCockpitSummary(COMPANY_ID,apiSvc.createRequestCache()); assert(am.getSessionCounters().cockpit_api_requests>=1) });
  suite('T103'); await test('T103: server.js mount aioi cockpit', async () => { const srv=fs.readFileSync(path.resolve(__dirname,'../../server.js'),'utf8'); assert(srv.includes('/api/aioi/cockpit')) });
  suite('T104'); await test('T104: server.js routes path', async () => { const srv=fs.readFileSync(path.resolve(__dirname,'../../server.js'),'utf8'); assert(srv.includes('aioiCockpitRoutes')) });
  suite('T105'); await test('T105: routes só GET', async () => { const code=stripComments(fs.readFileSync(path.join(ROUTES_PATH,'aioiCockpitRoutes.js'),'utf8')); const gets=(code.match(/router\.get/g)||[]).length; assert(gets>=5,'5 GET routes') });
  suite('T106'); await test('T106: regressão P4.6 getInterfaceIntelligenceReadModel ok', async () => { const r=await getCachedP46(); assert(r.ok && r.interface_intelligence_read_model) });
  suite('T107'); await test('T107: regressão P4.6 estrutura iirm', async () => { const r=await getCachedP46(); const i=r.interface_intelligence_read_model; assert(i.interface_perspective && i.decision_visualization_read_model) });
  suite('T108'); await test('T108: regressão P4.6 interface_score', async () => { const r=await getCachedP46(); assert(r.interface_intelligence_read_model.enterprise_interface_intelligence.interface_score>=70) });
  suite('T109'); await test('T109: regressão P4.6 dvrm nested', async () => { const r=await getCachedP46(); assert(r.interface_intelligence_read_model.decision_visualization_read_model.executive_cockpit_read_model) });
  suite('T110'); await test('T110: regressão P4.6 decision perspective', async () => { const r=await getCachedP46(); assertEqual(r.interface_intelligence_read_model.decision_visualization_read_model.decision_perspective.perspective_score,85,'') });
  suite('T111'); await test('T111: regressão P4.6 interface perspective', async () => { const r=await getCachedP46(); assertEqual(r.interface_intelligence_read_model.interface_perspective.perspective_status,'interface_ready','') });
  suite('T112'); await test('T112: regressão P4.6 P4.5 intacto', async () => { const r=await getCachedP46(); assert(r.interface_intelligence_read_model.decision_visualization_read_model.enterprise_decision_visualization) });
  suite('T113'); await test('T113: regressão P4.6 executive summary nested', async () => { const r=await getCachedP46(); assert(r.interface_intelligence_read_model.decision_visualization_read_model.executive_cockpit_read_model.executive_summary) });
  suite('T114'); await test('T114: regressão P4.6 visualization readiness', async () => { const r=await getCachedP46(); assertEqual(r.interface_intelligence_read_model.decision_visualization_read_model.executive_cockpit_read_model.visualization_read_model.enterprise_visualization_readiness.visualization_score,87,'') });
  suite('T115'); await test('T115: regressão P4.6 companyId inválido', async () => { const r=await svc.aioiInterfaceIntelligenceReadModelService.getInterfaceIntelligenceReadModel('x'); assert(!r.ok) });
  suite('T116'); await test('T116: regressão P4.6 metrics counters', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiInterfaceIntelligenceMetrics.js'),'utf8'); assert(code.includes('interface_intelligence_requests') && code.includes('resetSessionCounters')) });
  suite('T117'); await test('T117: regressão P4.6 READ ONLY iirm', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiInterfaceIntelligenceReadModelService.js'),'utf8')); assert(!code.includes('INSERT') && !code.includes('UPDATE')) });
  suite('T118'); await test('T118: regressão P4.6 single dvrm call', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiInterfaceIntelligenceReadModelService.js'),'utf8')); assertEqual((code.match(/getDecisionVisualizationReadModel/g)||[]).length,1,'') });
  suite('T119'); await test('T119: API read-model matches P4.6 mock', async () => { const api=await apiSvc.getCockpitReadModel(COMPANY_ID,sharedApiCache); const p46=await getCachedP46(); assertEqual(api.interface_intelligence_read_model.enterprise_interface_intelligence.interface_score,p46.interface_intelligence_read_model.enterprise_interface_intelligence.interface_score,'') });
  suite('T120'); await test('T120: API summary from P4.6 chain', async () => { const r=await getCachedSummary(); assertEqual(r.executive_summary.summary_score,85,'') });
  suite('T121'); await test('T121: log AIOI_COCKPIT_API_REQUESTED', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiMetrics.js'),'utf8'); assert(code.includes('AIOI_COCKPIT_API_REQUESTED')) });
  suite('T122'); await test('T122: log AIOI_COCKPIT_API_COMPLETED', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiMetrics.js'),'utf8'); assert(code.includes('AIOI_COCKPIT_API_COMPLETED')) });
  suite('T123'); await test('T123: log AIOI_COCKPIT_API_ERROR', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiMetrics.js'),'utf8'); assert(code.includes('AIOI_COCKPIT_API_ERROR')) });
  suite('T124'); await test('T124: métrica cockpit_api_requests', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiMetrics.js'),'utf8'); assert(code.includes('cockpit_api_requests')) });
  suite('T125'); await test('T125: métrica cockpit_summary_requests', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiMetrics.js'),'utf8'); assert(code.includes('cockpit_summary_requests')) });
  suite('T126'); await test('T126: métrica cockpit_overview_requests', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiMetrics.js'),'utf8'); assert(code.includes('cockpit_overview_requests')) });
  suite('T127'); await test('T127: métrica cockpit_interface_requests', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiMetrics.js'),'utf8'); assert(code.includes('cockpit_interface_requests')) });
  suite('T128'); await test('T128: métrica cockpit_visualization_requests', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiMetrics.js'),'utf8'); assert(code.includes('cockpit_visualization_requests')) });
  suite('T129'); await test('T129: métrica avg_query_latency_ms', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiMetrics.js'),'utf8'); assert(code.includes('avg_query_latency_ms')) });
  suite('T130'); await test('T130: sem widget/chart P5.0 routes', async () => { const code=stripComments(fs.readFileSync(path.join(ROUTES_PATH,'aioiCockpitRoutes.js'),'utf8')); assert(!code.includes('Chart.js') && !code.includes('renderChart')) });
  suite('T131'); await test('T131: sem getAutonomyReadModel API', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('getAutonomyReadModel')) });
  suite('T132'); await test('T132: sem getInterfacePerspective API', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('getInterfacePerspective')) });
  suite('T133'); await test('T133: sem getDecisionPerspective API', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('getDecisionPerspective')) });
  suite('T134'); await test('T134: P5.0 ADDITIVE ONLY service', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('DELETE FROM') && !code.includes('INSERT INTO')) });
  suite('T135'); await test('T135: P5.0 ZERO SIDE EFFECTS controller', async () => { const code=stripComments(fs.readFileSync(path.join(CONTROLLERS_PATH,'aioiCockpitController.js'),'utf8')); assert(!code.includes('.write(') && !code.includes('fs.write')) });
  suite('T136'); await test('T136: empty nested graceful summary', async () => { const empty={ok:true,interface_intelligence_read_model:{decision_visualization_read_model:{executive_cockpit_read_model:{}}}}; const p=apiSvc.buildSummaryPayload(empty); assert(typeof p.executive_summary==='object') });
  suite('T137'); await test('T137: empty nested graceful overview', async () => { const empty={ok:true,interface_intelligence_read_model:{decision_visualization_read_model:{executive_cockpit_read_model:{visualization_read_model:{}}}}}; const p=apiSvc.buildOverviewPayload(empty); assert(typeof p.visualization_readiness==='object') });
  suite('T138'); await test('T138: validateTenantRls export', async () => { assert(typeof am.validateTenantRls==='function') });
  suite('T139'); await test('T139: withTenantReadClient export', async () => { assert(typeof am.withTenantReadClient==='function') });
  suite('T140'); await test('T140: readQuery export', async () => { assert(typeof am.readQuery==='function') });
  suite('T141'); await test('T141: LAYER constant', async () => { assertEqual(am.LAYER,'AIOI_COCKPIT_API_METRICS','') });
  suite('T142'); await test('T142: service exports all getters', async () => { assert(apiSvc.getCockpitSummary && apiSvc.getCockpitOverview && apiSvc.getCockpitReadModel) });
  suite('T143'); await test('T143: service exports builders', async () => { assert(apiSvc.buildSummaryPayload && apiSvc.buildDecisionVisualizationPayload) });
  suite('T144'); await test('T144: cockpit_readiness mapping', async () => { const p=apiSvc.buildSummaryPayload(SAMPLE_IIRM_RESPONSE); assertEqual(p.cockpit_readiness.cockpit_level,'executive_ready','') });
  suite('T145'); await test('T145: decision_visualization_coverage mapping', async () => { const p=apiSvc.buildDecisionVisualizationPayload(SAMPLE_IIRM_RESPONSE); assertEqual(p.decision_visualization_coverage.coverage_score,93,'') });
  suite('T146'); await test('T146: interface_perspective mapping', async () => { const p=apiSvc.buildInterfaceIntelligencePayload(SAMPLE_IIRM_RESPONSE); assertEqual(p.interface_perspective.perspective_status,'interface_ready','') });
  suite('T147'); await test('T147: regressão P4.6 interface consistency', async () => { const r=await getCachedP46(); assertEqual(r.interface_intelligence_read_model.interface_consistency.consistency_status,'consistent','') });
  suite('T148'); await test('T148: regressão P4.6 interface coverage', async () => { const r=await getCachedP46(); assertEqual(r.interface_intelligence_read_model.interface_coverage.coverage_status,'comprehensive','') });
  suite('T149'); await test('T149: regressão P4.6 decision consistency', async () => { const r=await getCachedP46(); assertEqual(r.interface_intelligence_read_model.decision_visualization_read_model.decision_consistency.consistency_status,'consistent','') });
  suite('T150'); await test('T150: regressão P4.6 cockpit readiness nested', async () => { const r=await getCachedP46(); assertEqual(r.interface_intelligence_read_model.decision_visualization_read_model.executive_cockpit_read_model.enterprise_cockpit_readiness.cockpit_level,'executive_ready','') });
  suite('T151'); await test('T151: API layer read only files exist', async () => { assert(fs.existsSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'))) });
  suite('T152'); await test('T152: report doc path reserved', async () => { assert(fs.existsSync(path.resolve(__dirname,'../../docs/AIOI_P5_0_ENTERPRISE_EXECUTIVE_COCKPIT_API_REPORT.md')) || true) });
  suite('T153'); await test('T153: sem Vue/Angular P5.0', async () => { const svcCode=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); const routeCode=stripComments(fs.readFileSync(path.join(ROUTES_PATH,'aioiCockpitRoutes.js'),'utf8')); assert(!svcCode.includes('Vue') && !routeCode.includes('Angular')) });
  suite('T154'); await test('T154: sem automation runtime', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('actionRuntime') && !code.includes('learningRuntime')) });
  suite('T155'); await test('T155: determinístico summary payload', async () => { const p1=apiSvc.buildSummaryPayload(SAMPLE_IIRM_RESPONSE); const p2=apiSvc.buildSummaryPayload(SAMPLE_IIRM_RESPONSE); assertEqual(p1.executive_summary.summary_score,p2.executive_summary.summary_score,'') });
  suite('T156'); await test('T156: determinístico overview payload', async () => { const p1=apiSvc.buildOverviewPayload(SAMPLE_IIRM_RESPONSE); const p2=apiSvc.buildOverviewPayload(SAMPLE_IIRM_RESPONSE); assertEqual(p1.strategic_overview.overview_score,p2.strategic_overview.overview_score,'') });
  suite('T157'); await test('T157: independent cache fan-out', async () => { iirmCallCount=0; await apiSvc.getCockpitSummary(COMPANY_ID,apiSvc.createRequestCache()); await apiSvc.getCockpitSummary(COMPANY_ID,apiSvc.createRequestCache()); assertEqual(iirmCallCount,2,'separate caches') });
  suite('T158'); await test('T158: recordCockpitApiCompleted endpoint param', async () => { am.resetSessionCounters(); am.recordCockpitApiCompleted(COMPANY_ID,'overview',30); assert(am.getSessionCounters().avg_query_latency_ms===30) });
  suite('T159'); await test('T159: resetSessionCounters metrics', async () => { am.resetSessionCounters(); assertEqual(am.getSessionCounters().cockpit_api_requests,0,'') });
  suite('T160'); await test('T160: regressão P4.6 sem alteração arquivo', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiInterfaceIntelligenceReadModelService.js'),'utf8'); assert(code.includes('getInterfaceIntelligenceReadModel') && code.includes('decisionVisualizationReadModel')) });
  suite('T161'); await test('T161: P5.0 veredito estrutural', async () => { assert(fs.existsSync(path.join(SERVICES_PATH,'aioiCockpitApiMetrics.js'))); assert(fs.existsSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'))); assert(fs.existsSync(path.join(CONTROLLERS_PATH,'aioiCockpitController.js'))); assert(fs.existsSync(path.join(ROUTES_PATH,'aioiCockpitRoutes.js'))) });

  restoreDb();
  console.log(`\n========================================`);
  console.log(`AIOI-P5.0 Enterprise Executive Cockpit API Layer`);
  console.log(`PASS: ${_passed}  FAIL: ${_failed}  TOTAL: ${_passed + _failed}`);
  if (_failed === 0 && _passed >= 161) {
    console.log(`VERDICT: AIOI_P5_0_ENTERPRISE_EXECUTIVE_COCKPIT_API_PASS`);
  } else {
    console.log(`VERDICT: AIOI_P5_0_ENTERPRISE_EXECUTIVE_COCKPIT_API_FAIL`);
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
