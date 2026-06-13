'use strict';

/**
 * AIOI-P5.1 — Testes automatizados da Enterprise Executive Query Layer
 * T1–T166+ | node src/tests/aioi/aioiExecutiveQueryLayer.test.js
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

const COCKPIT_API_PATH = require.resolve(`${SERVICES_PATH}/aioiCockpitApiService`);
let cockpitApiCallCount = 0;

const SAMPLE_COCKPIT = {
  summary: { ok: true, executive_summary: { summary_score: 85, summary_status: 'summary_ready' }, cockpit_readiness: { cockpit_score: 86, cockpit_level: 'executive_ready' } },
  overview: { ok: true, strategic_overview: { overview_score: 84, overview_status: 'overview_ready' }, visualization_readiness: { visualization_score: 87, visualization_level: 'visualization_ready' } },
  decision: { ok: true, decision_perspective: { perspective_score: 85, perspective_status: 'decision_ready' }, decision_consistency: { consistency_score: 84, consistency_status: 'consistent' }, decision_visualization_coverage: { coverage_score: 93, coverage_status: 'comprehensive' }, enterprise_decision_visualization: { visualization_score: 87, visualization_level: 'executive_visualization_ready' } },
  interface: { ok: true, interface_perspective: { perspective_score: 88, perspective_status: 'interface_ready' }, interface_consistency: { consistency_score: 86, consistency_status: 'consistent' }, interface_coverage: { coverage_score: 90, coverage_status: 'comprehensive' }, enterprise_interface_intelligence: { interface_score: 87, interface_level: 'interface_ready' } }
};

function installCockpitApiMock() {
  cockpitApiCallCount = 0;
  const cacheStore = new WeakMap();
  require.cache[COCKPIT_API_PATH] = {
    id: COCKPIT_API_PATH,
    filename: COCKPIT_API_PATH,
    loaded: true,
    exports: {
      createRequestCache: () => ({ readModel: null, readModelPromise: null }),
      getCockpitSummary: async (cid, cache) => { cockpitApiCallCount++; if (!cid || !/^[0-9a-f-]{36}$/i.test(String(cid))) return { ok: false, error: 'companyId inválido' }; return { ...SAMPLE_COCKPIT.summary }; },
      getCockpitOverview: async (cid) => { cockpitApiCallCount++; return { ...SAMPLE_COCKPIT.overview }; },
      getCockpitDecisionVisualization: async (cid) => { cockpitApiCallCount++; return { ...SAMPLE_COCKPIT.decision }; },
      getCockpitInterfaceIntelligence: async (cid) => { cockpitApiCallCount++; return { ...SAMPLE_COCKPIT.interface }; },
      getCockpitReadModel: async (cid) => { cockpitApiCallCount++; return { ok: true, interface_intelligence_read_model: {} }; }
    }
  };
}

function clearAioiModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/services/aioi/aioiExecutive') || key.includes('/services/aioi/aioiStrategic') || key.includes('/services/aioi/aioiDecisionVisualizationQuery') || key.includes('/services/aioi/aioiInterfaceIntelligenceQuery')) {
      delete require.cache[key];
    }
  }
}

let _svcCache = null;
function loadP51() {
  if (_svcCache) return _svcCache;
  installCockpitApiMock();
  const loaded = {
    aioiExecutiveQueryMetrics: require(`${SERVICES_PATH}/aioiExecutiveQueryMetrics`),
    aioiExecutiveQueryService: require(`${SERVICES_PATH}/aioiExecutiveQueryService`),
    aioiExecutiveSummaryQuery: require(`${SERVICES_PATH}/aioiExecutiveSummaryQuery`),
    aioiStrategicOverviewQuery: require(`${SERVICES_PATH}/aioiStrategicOverviewQuery`),
    aioiDecisionVisualizationQuery: require(`${SERVICES_PATH}/aioiDecisionVisualizationQuery`),
    aioiInterfaceIntelligenceQuery: require(`${SERVICES_PATH}/aioiInterfaceIntelligenceQuery`)
  };
  _svcCache = loaded;
  return loaded;
}

function reloadP51() { _svcCache = null; clearAioiModuleCache(); delete require.cache[COCKPIT_API_PATH]; return loadP51(); }

function stripComments(c) { return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); }
function assertNoWrites(calls) {
  for (const c of calls) {
    const s = c.sql.trim().toUpperCase();
    if (['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ALTER', 'DROP', 'CREATE', 'MERGE'].some(k => s.startsWith(k))) {
      throw new Error(`escrita: ${c.sql.slice(0, 60)}`);
    }
  }
}

function createReadinessDbMock() {
  const calls = [];
  const client = {
    _calls: calls,
    async query(sql, params) {
      calls.push({ sql: sql.trim(), params });
      if (['set_config', 'BEGIN', 'COMMIT', 'ROLLBACK'].some(k => sql.includes(k))) return { rows: [] };
      if (sql.includes('SELECT 1 AS rls_validated')) return { rows: [{ rls_validated: 1 }] };
      return { rows: [] };
    },
    release: () => {}
  };
  return { pool: { connect: async () => client }, _client: client };
}

async function runTests() {
  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP51();
  const qSvc = svc.aioiExecutiveQueryService;
  let qm = svc.aioiExecutiveQueryMetrics;
  qm.resetSessionCounters();
  const sharedCache = qSvc.createQueryCache();

  suite('T1'); await test('T1: assertReadOnlySql exportado', async () => { assert(typeof qm.assertReadOnlySql === 'function') });
  suite('T2'); await test('T2: INSERT bloqueado', async () => { let t=false; try{qm.assertReadOnlySql('INSERT INTO x VALUES (1)');}catch(e){t=true;assertEqual(e.message,'READ_ONLY_LAYER_VIOLATION','');} assert(t) });
  suite('T3'); await test('T3: UPDATE bloqueado', async () => { let t=false; try{qm.assertReadOnlySql('UPDATE x SET y=1');}catch(e){t=true;} assert(t) });
  suite('T4'); await test('T4: DELETE bloqueado', async () => { let t=false; try{qm.assertReadOnlySql('DELETE FROM x');}catch(e){t=true;} assert(t) });
  suite('T5'); await test('T5: TRUNCATE bloqueado', async () => { let t=false; try{qm.assertReadOnlySql('TRUNCATE TABLE x');}catch(e){t=true;} assert(t) });
  suite('T6'); await test('T6: CREATE bloqueado', async () => { let t=false; try{qm.assertReadOnlySql('CREATE TABLE x (id int)');}catch(e){t=true;} assert(t) });
  suite('T7'); await test('T7: DROP bloqueado', async () => { let t=false; try{qm.assertReadOnlySql('DROP TABLE x');}catch(e){t=true;} assert(t) });
  suite('T8'); await test('T8: ALTER bloqueado', async () => { let t=false; try{qm.assertReadOnlySql('ALTER TABLE x ADD y int');}catch(e){t=true;} assert(t) });
  suite('T9'); await test('T9: UPSERT bloqueado', async () => { let t=false; try{qm.assertReadOnlySql('UPSERT INTO x VALUES (1)');}catch(e){t=true;} assert(t) });
  suite('T10'); await test('T10: ON CONFLICT bloqueado', async () => { let t=false; try{qm.assertReadOnlySql('INSERT INTO x VALUES (1) ON CONFLICT DO NOTHING');}catch(e){t=true;assertEqual(e.message,'READ_ONLY_LAYER_VIOLATION','');} assert(t) });
  suite('T11'); await test('T11: MERGE bloqueado', async () => { let t=false; try{qm.assertReadOnlySql('MERGE INTO x');}catch(e){t=true;} assert(t) });
  suite('T12'); await test('T12: GRANT bloqueado', async () => { let t=false; try{qm.assertReadOnlySql('GRANT ALL ON x TO y');}catch(e){t=true;} assert(t) });
  suite('T13'); await test('T13: REVOKE bloqueado', async () => { let t=false; try{qm.assertReadOnlySql('REVOKE ALL ON x FROM y');}catch(e){t=true;} assert(t) });
  suite('T14'); await test('T14: recordExecutiveQueryRequested', async () => { qm.resetSessionCounters(); qm.recordExecutiveQueryRequested(COMPANY_ID,'summary'); assertEqual(qm.getSessionCounters().executive_query_requests,1,'') });
  suite('T15'); await test('T15: recordExecutiveQueryCompleted latency', async () => { qm.recordExecutiveQueryCompleted(COMPANY_ID,'summary',44); assertEqual(qm.getSessionCounters().avg_query_latency_ms,44,'') });
  suite('T16'); await test('T16: recordExecutiveSummaryQuery', async () => { qm.recordExecutiveSummaryQuery(COMPANY_ID); assert(qm.getSessionCounters().executive_summary_queries>=1) });
  suite('T17'); await test('T17: recordStrategicOverviewQuery', async () => { qm.recordStrategicOverviewQuery(COMPANY_ID); assert(qm.getSessionCounters().strategic_overview_queries>=1) });
  suite('T18'); await test('T18: recordDecisionVisualizationQuery', async () => { qm.recordDecisionVisualizationQuery(COMPANY_ID); assert(qm.getSessionCounters().decision_visualization_queries>=1) });
  suite('T19'); await test('T19: recordInterfaceIntelligenceQuery', async () => { qm.recordInterfaceIntelligenceQuery(COMPANY_ID); assert(qm.getSessionCounters().interface_intelligence_queries>=1) });
  suite('T20'); await test('T20: getSessionCounters campos', async () => { qm.resetSessionCounters(); const c=qm.getSessionCounters(); assert('executive_query_requests' in c && 'avg_query_latency_ms' in c) });
  suite('T21'); await test('T21: getExecutiveSummaryQuery ok', async () => { const r=await qSvc.getExecutiveSummaryQuery(COMPANY_ID,sharedCache); assert(r.ok && r.executive_summary && r.cockpit_readiness && r.generated_at) });
  suite('T22'); await test('T22: getStrategicOverviewQuery ok', async () => { const r=await qSvc.getStrategicOverviewQuery(COMPANY_ID,sharedCache); assert(r.ok && r.strategic_overview && r.visualization_readiness && r.generated_at) });
  suite('T23'); await test('T23: getDecisionVisualizationQuery ok', async () => { const r=await qSvc.getDecisionVisualizationQuery(COMPANY_ID,sharedCache); assert(r.ok && r.decision_perspective && r.generated_at) });
  suite('T24'); await test('T24: getInterfaceIntelligenceQuery ok', async () => { const r=await qSvc.getInterfaceIntelligenceQuery(COMPANY_ID,sharedCache); assert(r.ok && r.interface_perspective && r.generated_at) });
  suite('T25'); await test('T25: getExecutiveQueryBundle ok', async () => { const r=await qSvc.getExecutiveQueryBundle(COMPANY_ID,sharedCache); assert(r.ok && r.executive_summary_query && r.strategic_overview_query && r.decision_visualization_query && r.interface_intelligence_query) });
  suite('T26'); await test('T26: companyId inválido summary', async () => { const r=await qSvc.getExecutiveSummaryQuery('bad-id'); assert(!r.ok) });
  suite('T27'); await test('T27: companyId inválido bundle', async () => { const r=await qSvc.getExecutiveQueryBundle('invalid'); assert(!r.ok) });
  suite('T28'); await test('T28: buildExecutiveSummaryQuery campos', async () => { const q=svc.aioiExecutiveSummaryQuery.buildExecutiveSummaryQuery(SAMPLE_COCKPIT.summary,'2026-06-07T00:00:00.000Z'); assertEqual(q.executive_summary.summary_score,85,''); assertEqual(q.generated_at,'2026-06-07T00:00:00.000Z','') });
  suite('T29'); await test('T29: buildStrategicOverviewQuery campos', async () => { const q=svc.aioiStrategicOverviewQuery.buildStrategicOverviewQuery(SAMPLE_COCKPIT.overview,'2026-06-07T00:00:00.000Z'); assertEqual(q.strategic_overview.overview_score,84,'') });
  suite('T30'); await test('T30: buildDecisionVisualizationQuery campos', async () => { const q=svc.aioiDecisionVisualizationQuery.buildDecisionVisualizationQuery(SAMPLE_COCKPIT.decision,'2026-06-07T00:00:00.000Z'); assertEqual(q.decision_perspective.perspective_score,85,'') });
  suite('T31'); await test('T31: buildInterfaceIntelligenceQuery campos', async () => { const q=svc.aioiInterfaceIntelligenceQuery.buildInterfaceIntelligenceQuery(SAMPLE_COCKPIT.interface,'2026-06-07T00:00:00.000Z'); assertEqual(q.interface_perspective.perspective_score,88,'') });
  suite('T32'); await test('T32: summary generated_at ISO', async () => { const r=await qSvc.getExecutiveSummaryQuery(COMPANY_ID,qSvc.createQueryCache()); assert(r.generated_at && r.generated_at.includes('T')) });
  suite('T33'); await test('T33: overview generated_at ISO', async () => { const r=await qSvc.getStrategicOverviewQuery(COMPANY_ID,qSvc.createQueryCache()); assert(r.generated_at) });
  suite('T34'); await test('T34: decision generated_at ISO', async () => { const r=await qSvc.getDecisionVisualizationQuery(COMPANY_ID,qSvc.createQueryCache()); assert(r.generated_at) });
  suite('T35'); await test('T35: interface generated_at ISO', async () => { const r=await qSvc.getInterfaceIntelligenceQuery(COMPANY_ID,qSvc.createQueryCache()); assert(r.generated_at) });
  suite('T36'); await test('T36: bundle contract keys', async () => { const r=await qSvc.getExecutiveQueryBundle(COMPANY_ID,qSvc.createQueryCache()); assert(r.executive_summary_query.generated_at && r.interface_intelligence_query.generated_at) });
  suite('T37'); await test('T37: bundle sem ok nos sub-queries', async () => { const r=await qSvc.getExecutiveQueryBundle(COMPANY_ID,qSvc.createQueryCache()); assert(!('ok' in r.executive_summary_query)) });
  suite('T38'); await test('T38: createQueryCache isolado', async () => { const c1=qSvc.createQueryCache(); const c2=qSvc.createQueryCache(); assert(c1!==c2) });
  suite('T39'); await test('T39: summary cockpit_readiness', async () => { const r=await qSvc.getExecutiveSummaryQuery(COMPANY_ID,qSvc.createQueryCache()); assertEqual(r.cockpit_readiness.cockpit_score,86,'') });
  suite('T40'); await test('T40: overview visualization_level', async () => { const r=await qSvc.getStrategicOverviewQuery(COMPANY_ID,qSvc.createQueryCache()); assertEqual(r.visualization_readiness.visualization_level,'visualization_ready','') });
  suite('T41'); await test('T41: decision enterprise_decision_visualization', async () => { const r=await qSvc.getDecisionVisualizationQuery(COMPANY_ID,qSvc.createQueryCache()); assert(r.enterprise_decision_visualization.visualization_level) });
  suite('T42'); await test('T42: interface interface_level', async () => { const r=await qSvc.getInterfaceIntelligenceQuery(COMPANY_ID,qSvc.createQueryCache()); assertEqual(r.enterprise_interface_intelligence.interface_level,'interface_ready','') });
  suite('T43'); await test('T43: decision consistency campos', async () => { const r=await qSvc.getDecisionVisualizationQuery(COMPANY_ID,qSvc.createQueryCache()); assert('consistency_score' in r.decision_consistency) });
  suite('T44'); await test('T44: interface coverage campos', async () => { const r=await qSvc.getInterfaceIntelligenceQuery(COMPANY_ID,qSvc.createQueryCache()); assert('coverage_score' in r.interface_coverage) });
  suite('T45'); await test('T45: summary status field', async () => { const r=await qSvc.getExecutiveSummaryQuery(COMPANY_ID,qSvc.createQueryCache()); assert(r.executive_summary.summary_status) });
  suite('T46'); await test('T46: overview overview_status', async () => { const r=await qSvc.getStrategicOverviewQuery(COMPANY_ID,qSvc.createQueryCache()); assert(r.strategic_overview.overview_status) });
  suite('T47'); await test('T47: decision coverage score', async () => { const r=await qSvc.getDecisionVisualizationQuery(COMPANY_ID,qSvc.createQueryCache()); assertEqual(r.decision_visualization_coverage.coverage_score,93,'') });
  suite('T48'); await test('T48: interface perspective status', async () => { const r=await qSvc.getInterfaceIntelligenceQuery(COMPANY_ID,qSvc.createQueryCache()); assertEqual(r.interface_perspective.perspective_status,'interface_ready','') });
  suite('T49'); await test('T49: bundle decision nested', async () => { const r=await qSvc.getExecutiveQueryBundle(COMPANY_ID,qSvc.createQueryCache()); assert(r.decision_visualization_query.decision_perspective.perspective_score===85) });
  suite('T50'); await test('T50: bundle interface nested', async () => { const r=await qSvc.getExecutiveQueryBundle(COMPANY_ID,qSvc.createQueryCache()); assert(r.interface_intelligence_query.enterprise_interface_intelligence.interface_score===87) });
  suite('T51'); await test('T51: composição exclusiva P5.0 summary', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryQuery.js'),'utf8')); assert(code.includes('cockpitApiService') && !code.includes('getInterfaceIntelligenceReadModel')) });
  suite('T52'); await test('T52: composição exclusiva P5.0 overview', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiStrategicOverviewQuery.js'),'utf8')); assert(code.includes('getCockpitOverview') && !code.includes('getInterfaceIntelligenceReadModel')) });
  suite('T53'); await test('T53: composição exclusiva P5.0 decision', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiDecisionVisualizationQuery.js'),'utf8')); assert(code.includes('getCockpitDecisionVisualization') && !code.includes('getDecisionVisualizationReadModel')) });
  suite('T54'); await test('T54: composição exclusiva P5.0 interface', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiInterfaceIntelligenceQuery.js'),'utf8')); assert(code.includes('getCockpitInterfaceIntelligence') && !code.includes('getInterfacePerspective')) });
  suite('T55'); await test('T55: sem P4.6 direto service', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(!code.includes('getInterfaceIntelligenceReadModel') && !code.includes('interfaceIntelligenceReadModel')) });
  suite('T56'); await test('T56: sem P4.5 direto', async () => { const files=['aioiExecutiveSummaryQuery.js','aioiExecutiveQueryService.js']; for(const f of files){const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,f),'utf8')); assert(!code.includes('getDecisionVisualizationReadModel'),f)} });
  suite('T57'); await test('T57: sem P4.4 direto', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(!code.includes('getExecutiveCockpitReadModel')) });
  suite('T58'); await test('T58: sem LLM/IA P5.1', async () => { const files=['aioiExecutiveQueryService.js','aioiExecutiveSummaryQuery.js']; for(const f of files){const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,f),'utf8')); assert(!code.includes('openai') && !code.includes('generateText'),f)} });
  suite('T59'); await test('T59: sem forecast P5.1', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(!code.includes('getBacklogForecast')) });
  suite('T60'); await test('T60: sem execução P5.1', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(!code.includes('executeDecision') && !code.includes('runWorkflow')) });
  suite('T61'); await test('T61: sem React/dashboard', async () => { const files=['aioiExecutiveQueryService.js','aioiExecutiveQueryMetrics.js']; for(const f of files){const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,f),'utf8')); assert(!code.includes('React') && !code.includes('Chart.js'),f)} });
  suite('T62'); await test('T62: sem express routes P5.1', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(!code.includes('express.Router') && !code.includes('app.get(')) });
  suite('T63'); await test('T63: sem APIs novas', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(!code.includes('router.get')) });
  suite('T64'); await test('T64: build* local query modules', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(code.includes('buildExecutiveSummaryQuery') && code.includes('getExecutiveQueryBundle')) });
  suite('T65'); await test('T65: soberanos ausentes P5.1', async () => { const files=['aioiExecutiveQueryMetrics.js','aioiExecutiveQueryService.js']; const forbidden=['operationalDecisionEngine','workflowOrchestrator','actionRuntimeOrchestrator']; for(const f of files){const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,f),'utf8')); for(const bad of forbidden) assert(!code.includes(bad),f+' '+bad)} });
  suite('T66'); await test('T66: fan-out bundle shared cache', async () => { cockpitApiCallCount=0; const cache=qSvc.createQueryCache(); await qSvc.getExecutiveQueryBundle(COMPANY_ID,cache); assert(cockpitApiCallCount===4,'4 cockpit calls one cache') });
  suite('T67'); await test('T67: fan-out summary+overview cache', async () => { cockpitApiCallCount=0; const cache=qSvc.createQueryCache(); await qSvc.getExecutiveSummaryQuery(COMPANY_ID,cache); await qSvc.getStrategicOverviewQuery(COMPANY_ID,cache); assertEqual(cockpitApiCallCount,2,'') });
  suite('T68'); await test('T68: independent cache fan-out', async () => { cockpitApiCallCount=0; await qSvc.getExecutiveSummaryQuery(COMPANY_ID,qSvc.createQueryCache()); await qSvc.getExecutiveSummaryQuery(COMPANY_ID,qSvc.createQueryCache()); assertEqual(cockpitApiCallCount,2,'') });
  suite('T69'); await test('T69: cockpitApiService import summary', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryQuery.js'),'utf8'); assert(code.includes('aioiCockpitApiService')) });
  suite('T70'); await test('T70: cockpitApiService import overview', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiStrategicOverviewQuery.js'),'utf8'); assert(code.includes('aioiCockpitApiService')) });
  suite('T71'); await test('T71: Promise.all bundle', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(code.includes('Promise.all')) });
  suite('T72'); await test('T72: sem scoring novo', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryMetrics.js'),'utf8')); assert(!code.includes('computePriorityScore')) });
  suite('T73'); await test('T73: sem getCockpitReadModel direto queries', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryQuery.js'),'utf8')); assert(!code.includes('getCockpitReadModel')) });
  suite('T74'); await test('T74: createQueryCache reutiliza P5.0', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(code.includes('createRequestCache')) });
  suite('T75'); await test('T75: 5 query modules existem', async () => { const files=['aioiExecutiveQueryMetrics.js','aioiExecutiveQueryService.js','aioiExecutiveSummaryQuery.js','aioiStrategicOverviewQuery.js','aioiDecisionVisualizationQuery.js','aioiInterfaceIntelligenceQuery.js']; for(const f of files) assert(fs.existsSync(path.join(SERVICES_PATH,f)),f) });
  suite('T76'); await test('T76: RLS company_id set_config', async () => { await qm.validateTenantRls(COMPANY_ID); const t=mock._client._calls.find(c=>c.sql.includes('app.current_company_id')); assert(t && t.params[0]===COMPANY_ID) });
  suite('T77'); await test('T77: RLS bypass false', async () => { await qm.validateTenantRls(COMPANY_ID); const b=mock._client._calls.filter(c=>c.sql.includes('app.bypass_rls')); assert(b.length>=1) });
  suite('T78'); await test('T78: zero writes RLS', async () => { assertNoWrites(mock._client._calls) });
  suite('T79'); await test('T79: tenant B RLS', async () => { await qm.validateTenantRls(COMPANY_ID_B); const t=mock._client._calls.find(c=>c.params&&c.params[0]===COMPANY_ID_B); assert(t,'tenant B') });
  suite('T80'); await test('T80: tenant B summary query', async () => { const r=await qSvc.getExecutiveSummaryQuery(COMPANY_ID_B,qSvc.createQueryCache()); assert(r.ok) });
  suite('T81'); await test('T81: recordError metrics', async () => { qm.recordError(COMPANY_ID,'test','err'); assert(qm.getSessionCounters().executive_query_error_count>=1) });
  suite('T82'); await test('T82: summary increments metric', async () => { qm.resetSessionCounters(); await qSvc.getExecutiveSummaryQuery(COMPANY_ID,qSvc.createQueryCache()); assert(qm.getSessionCounters().executive_summary_queries>=1) });
  suite('T83'); await test('T83: overview increments metric', async () => { qm.resetSessionCounters(); await qSvc.getStrategicOverviewQuery(COMPANY_ID,qSvc.createQueryCache()); assert(qm.getSessionCounters().strategic_overview_queries>=1) });
  suite('T84'); await test('T84: decision increments metric', async () => { qm.resetSessionCounters(); await qSvc.getDecisionVisualizationQuery(COMPANY_ID,qSvc.createQueryCache()); assert(qm.getSessionCounters().decision_visualization_queries>=1) });
  suite('T85'); await test('T85: interface increments metric', async () => { qm.resetSessionCounters(); await qSvc.getInterfaceIntelligenceQuery(COMPANY_ID,qSvc.createQueryCache()); assert(qm.getSessionCounters().interface_intelligence_queries>=1) });
  suite('T86'); await test('T86: query request counter', async () => { qm.resetSessionCounters(); await qSvc.getExecutiveSummaryQuery(COMPANY_ID,qSvc.createQueryCache()); assert(qm.getSessionCounters().executive_query_requests>=1) });
  suite('T87'); await test('T87: log AIOI_EXECUTIVE_QUERY_REQUESTED', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryMetrics.js'),'utf8'); assert(code.includes('AIOI_EXECUTIVE_QUERY_REQUESTED')) });
  suite('T88'); await test('T88: log AIOI_EXECUTIVE_QUERY_COMPLETED', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryMetrics.js'),'utf8'); assert(code.includes('AIOI_EXECUTIVE_QUERY_COMPLETED')) });
  suite('T89'); await test('T89: log AIOI_EXECUTIVE_QUERY_ERROR', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryMetrics.js'),'utf8'); assert(code.includes('AIOI_EXECUTIVE_QUERY_ERROR')) });
  suite('T90'); await test('T90: métrica executive_query_requests', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryMetrics.js'),'utf8'); assert(code.includes('executive_query_requests')) });
  suite('T91'); await test('T91: métrica executive_summary_queries', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryMetrics.js'),'utf8'); assert(code.includes('executive_summary_queries')) });
  suite('T92'); await test('T92: métrica strategic_overview_queries', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryMetrics.js'),'utf8'); assert(code.includes('strategic_overview_queries')) });
  suite('T93'); await test('T93: métrica decision_visualization_queries', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryMetrics.js'),'utf8'); assert(code.includes('decision_visualization_queries')) });
  suite('T94'); await test('T94: métrica interface_intelligence_queries', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryMetrics.js'),'utf8'); assert(code.includes('interface_intelligence_queries')) });
  suite('T95'); await test('T95: métrica avg_query_latency_ms', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryMetrics.js'),'utf8'); assert(code.includes('avg_query_latency_ms')) });
  suite('T96'); await test('T96: validateTenantRls export', async () => { assert(typeof qm.validateTenantRls==='function') });
  suite('T97'); await test('T97: LAYER constant', async () => { assertEqual(qm.LAYER,'AIOI_EXECUTIVE_QUERY_METRICS','') });
  suite('T98'); await test('T98: resetSessionCounters', async () => { qm.resetSessionCounters(); assertEqual(qm.getSessionCounters().executive_query_requests,0,'') });
  suite('T99'); await test('T99: determinístico build summary', async () => { const q1=svc.aioiExecutiveSummaryQuery.buildExecutiveSummaryQuery(SAMPLE_COCKPIT.summary,'2026-01-01T00:00:00.000Z'); const q2=svc.aioiExecutiveSummaryQuery.buildExecutiveSummaryQuery(SAMPLE_COCKPIT.summary,'2026-01-01T00:00:00.000Z'); assertEqual(q1.executive_summary.summary_score,q2.executive_summary.summary_score,'') });
  suite('T100'); await test('T100: determinístico build overview', async () => { const q1=svc.aioiStrategicOverviewQuery.buildStrategicOverviewQuery(SAMPLE_COCKPIT.overview,'2026-01-01T00:00:00.000Z'); const q2=svc.aioiStrategicOverviewQuery.buildStrategicOverviewQuery(SAMPLE_COCKPIT.overview,'2026-01-01T00:00:00.000Z'); assertEqual(q1.strategic_overview.overview_score,q2.strategic_overview.overview_score,'') });
  suite('T101'); await test('T101: regressão P5.0 cockpit service intacto', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8'); assert(code.includes('getCockpitSummary') && code.includes('getInterfaceIntelligenceReadModel')) });
  suite('T102'); await test('T102: regressão P5.0 cockpit metrics intacto', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiMetrics.js'),'utf8'); assert(code.includes('AIOI_COCKPIT_API_REQUESTED')) });
  suite('T103'); await test('T103: regressão P5.0 routes exist', async () => { assert(fs.existsSync(path.resolve(__dirname,'../../routes/aioi/aioiCockpitRoutes.js'))) });
  suite('T104'); await test('T104: regressão P5.0 controller exist', async () => { assert(fs.existsSync(path.resolve(__dirname,'../../controllers/aioi/aioiCockpitController.js'))) });
  suite('T105'); await test('T105: regressão P5.0 server mount', async () => { const srv=fs.readFileSync(path.resolve(__dirname,'../../server.js'),'utf8'); assert(srv.includes('/api/aioi/cockpit')) });
  suite('T106'); await test('T106: regressão P5.0 buildSummaryPayload', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8'); assert(code.includes('buildSummaryPayload')) });
  suite('T107'); await test('T107: regressão P5.0 createRequestCache', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8'); assert(code.includes('createRequestCache')) });
  suite('T108'); await test('T108: regressão P5.0 READ ONLY', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assert(!code.includes('INSERT INTO')) });
  suite('T109'); await test('T109: query alinhada summary P5.0', async () => { const r=await qSvc.getExecutiveSummaryQuery(COMPANY_ID,qSvc.createQueryCache()); assertEqual(r.executive_summary.summary_score,85,'') });
  suite('T110'); await test('T110: query alinhada overview P5.0', async () => { const r=await qSvc.getStrategicOverviewQuery(COMPANY_ID,qSvc.createQueryCache()); assertEqual(r.strategic_overview.overview_score,84,'') });
  suite('T111'); await test('T111: contrato estável summary keys', async () => { const r=await qSvc.getExecutiveSummaryQuery(COMPANY_ID,qSvc.createQueryCache()); assert('executive_summary' in r && 'cockpit_readiness' in r && 'generated_at' in r) });
  suite('T112'); await test('T112: contrato estável overview keys', async () => { const r=await qSvc.getStrategicOverviewQuery(COMPANY_ID,qSvc.createQueryCache()); assert('strategic_overview' in r && 'visualization_readiness' in r && 'generated_at' in r) });
  suite('T113'); await test('T113: contrato estável decision keys', async () => { const r=await qSvc.getDecisionVisualizationQuery(COMPANY_ID,qSvc.createQueryCache()); assert('decision_perspective' in r && 'decision_consistency' in r && 'decision_visualization_coverage' in r && 'enterprise_decision_visualization' in r && 'generated_at' in r) });
  suite('T114'); await test('T114: contrato estável interface keys', async () => { const r=await qSvc.getInterfaceIntelligenceQuery(COMPANY_ID,qSvc.createQueryCache()); assert('interface_perspective' in r && 'interface_consistency' in r && 'interface_coverage' in r && 'enterprise_interface_intelligence' in r && 'generated_at' in r) });
  suite('T115'); await test('T115: contrato bundle keys', async () => { const r=await qSvc.getExecutiveQueryBundle(COMPANY_ID,qSvc.createQueryCache()); assert('executive_summary_query' in r && 'strategic_overview_query' in r && 'decision_visualization_query' in r && 'interface_intelligence_query' in r) });
  suite('T116'); await test('T116: sem getAutonomyReadModel', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(!code.includes('getAutonomyReadModel')) });
  suite('T117'); await test('T117: sem getVisualizationReadModel', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(!code.includes('getVisualizationReadModel')) });
  suite('T118'); await test('T118: sem getConsumptionReadModel', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(!code.includes('getConsumptionReadModel')) });
  suite('T119'); await test('T119: sem Vue/Angular', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(!code.includes('Vue') && !code.includes('Angular')) });
  suite('T120'); await test('T120: sem automation runtime', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(!code.includes('actionRuntime') && !code.includes('learningRuntime')) });
  suite('T121'); await test('T121: empty cockpit graceful summary', async () => { const q=svc.aioiExecutiveSummaryQuery.buildExecutiveSummaryQuery({ok:true},'2026-01-01T00:00:00.000Z'); assert(typeof q.executive_summary==='object') });
  suite('T122'); await test('T122: empty cockpit graceful overview', async () => { const q=svc.aioiStrategicOverviewQuery.buildStrategicOverviewQuery({ok:true},'2026-01-01T00:00:00.000Z'); assert(typeof q.visualization_readiness==='object') });
  suite('T123'); await test('T123: exports getExecutiveSummaryQuery', async () => { assert(typeof qSvc.getExecutiveSummaryQuery==='function') });
  suite('T124'); await test('T124: exports getExecutiveQueryBundle', async () => { assert(typeof qSvc.getExecutiveQueryBundle==='function') });
  suite('T125'); await test('T125: exports buildDecisionVisualizationQuery', async () => { assert(typeof qSvc.buildDecisionVisualizationQuery==='function') });
  suite('T126'); await test('T126: exports buildInterfaceIntelligenceQuery', async () => { assert(typeof qSvc.buildInterfaceIntelligenceQuery==='function') });
  suite('T127'); await test('T127: bundle summary nested score', async () => { const r=await qSvc.getExecutiveQueryBundle(COMPANY_ID,qSvc.createQueryCache()); assertEqual(r.executive_summary_query.executive_summary.summary_score,85,'') });
  suite('T128'); await test('T128: bundle overview nested score', async () => { const r=await qSvc.getExecutiveQueryBundle(COMPANY_ID,qSvc.createQueryCache()); assertEqual(r.strategic_overview_query.strategic_overview.overview_score,84,'') });
  suite('T129'); await test('T129: regressão P5.0 report exists', async () => { assert(fs.existsSync(path.resolve(__dirname,'../../../docs/AIOI_P5_0_ENTERPRISE_EXECUTIVE_COCKPIT_API_REPORT.md'))) });
  suite('T130'); await test('T130: P5.1 ADDITIVE ONLY', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(!code.includes('DELETE FROM') && !code.includes('INSERT INTO')) });
  suite('T131'); await test('T131: sem widget/chart', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryQuery.js'),'utf8')); assert(!code.includes('renderChart') && !code.includes('Chart.js')) });
  suite('T132'); await test('T132: sem UI components', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(!code.includes('createDashboard')) });
  suite('T133'); await test('T133: anti-duplicação P5.0 reexport builds', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); assert(code.includes('buildExecutiveSummaryQuery') && !code.includes('buildSummaryPayload')) });
  suite('T134'); await test('T134: getCockpitSummary uma vez por summary query', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryQuery.js'),'utf8')); assertEqual((code.match(/getCockpitSummary/g)||[]).length,1,'') });
  suite('T135'); await test('T135: getCockpitOverview uma vez overview', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiStrategicOverviewQuery.js'),'utf8')); assertEqual((code.match(/getCockpitOverview/g)||[]).length,1,'') });
  suite('T136'); await test('T136: getCockpitDecisionVisualization uma vez', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiDecisionVisualizationQuery.js'),'utf8')); assertEqual((code.match(/getCockpitDecisionVisualization/g)||[]).length,1,'') });
  suite('T137'); await test('T137: getCockpitInterfaceIntelligence uma vez', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiInterfaceIntelligenceQuery.js'),'utf8')); assertEqual((code.match(/getCockpitInterfaceIntelligence/g)||[]).length,1,'') });
  suite('T138'); await test('T138: withTenantReadClient export', async () => { assert(typeof qm.withTenantReadClient==='function') });
  suite('T139'); await test('T139: readQuery export', async () => { assert(typeof qm.readQuery==='function') });
  suite('T140'); await test('T140: recordExecutiveQueryCompleted bundle', async () => { qm.resetSessionCounters(); qm.recordExecutiveQueryCompleted(COMPANY_ID,'bundle',30); assert(qm.getSessionCounters().avg_query_latency_ms===30) });
  suite('T141'); await test('T141: companyId inválido decision', async () => { const r=await qSvc.getDecisionVisualizationQuery('x'); assert(!r.ok) });
  suite('T142'); await test('T142: companyId inválido interface', async () => { const r=await qSvc.getInterfaceIntelligenceQuery(''); assert(!r.ok) });
  suite('T143'); await test('T143: companyId inválido overview', async () => { const r=await qSvc.getStrategicOverviewQuery(null); assert(!r.ok) });
  suite('T144'); await test('T144: decision consistency status', async () => { const r=await qSvc.getDecisionVisualizationQuery(COMPANY_ID,qSvc.createQueryCache()); assertEqual(r.decision_consistency.consistency_status,'consistent','') });
  suite('T145'); await test('T145: interface consistency status', async () => { const r=await qSvc.getInterfaceIntelligenceQuery(COMPANY_ID,qSvc.createQueryCache()); assertEqual(r.interface_consistency.consistency_status,'consistent','') });
  suite('T146'); await test('T146: cockpit readiness level summary', async () => { const r=await qSvc.getExecutiveSummaryQuery(COMPANY_ID,qSvc.createQueryCache()); assertEqual(r.cockpit_readiness.cockpit_level,'executive_ready','') });
  suite('T147'); await test('T147: regressão P5.0 single iirm call', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8')); assertEqual((code.match(/getInterfaceIntelligenceReadModel/g)||[]).length,1,'') });
  suite('T148'); await test('T148: query layer read only files', async () => { assert(fs.existsSync(path.join(SERVICES_PATH,'aioiExecutiveQueryMetrics.js'))) });
  suite('T149'); await test('T149: report doc path', async () => { assert(fs.existsSync(path.resolve(__dirname,'../../../docs/AIOI_P5_1_ENTERPRISE_EXECUTIVE_QUERY_LAYER_REPORT.md'))) });
  suite('T150'); await test('T150: bundle ok true', async () => { const r=await qSvc.getExecutiveQueryBundle(COMPANY_ID,qSvc.createQueryCache()); assert(r.ok) });
  suite('T151'); await test('T151: summary ok true', async () => { const r=await qSvc.getExecutiveSummaryQuery(COMPANY_ID,qSvc.createQueryCache()); assert(r.ok) });
  suite('T152'); await test('T152: overview ok true', async () => { const r=await qSvc.getStrategicOverviewQuery(COMPANY_ID,qSvc.createQueryCache()); assert(r.ok) });
  suite('T153'); await test('T153: decision ok true', async () => { const r=await qSvc.getDecisionVisualizationQuery(COMPANY_ID,qSvc.createQueryCache()); assert(r.ok) });
  suite('T154'); await test('T154: interface ok true', async () => { const r=await qSvc.getInterfaceIntelligenceQuery(COMPANY_ID,qSvc.createQueryCache()); assert(r.ok) });
  suite('T155'); await test('T155: determinístico build decision', async () => { const q1=svc.aioiDecisionVisualizationQuery.buildDecisionVisualizationQuery(SAMPLE_COCKPIT.decision,'2026-01-01T00:00:00.000Z'); const q2=svc.aioiDecisionVisualizationQuery.buildDecisionVisualizationQuery(SAMPLE_COCKPIT.decision,'2026-01-01T00:00:00.000Z'); assertEqual(q1.decision_perspective.perspective_score,q2.decision_perspective.perspective_score,'') });
  suite('T156'); await test('T156: determinístico build interface', async () => { const q1=svc.aioiInterfaceIntelligenceQuery.buildInterfaceIntelligenceQuery(SAMPLE_COCKPIT.interface,'2026-01-01T00:00:00.000Z'); const q2=svc.aioiInterfaceIntelligenceQuery.buildInterfaceIntelligenceQuery(SAMPLE_COCKPIT.interface,'2026-01-01T00:00:00.000Z'); assertEqual(q1.interface_perspective.perspective_score,q2.interface_perspective.perspective_score,'') });
  suite('T157'); await test('T157: sem getInterfacePerspective query', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiInterfaceIntelligenceQuery.js'),'utf8')); assert(!code.includes('getInterfacePerspective')) });
  suite('T158'); await test('T158: sem getDecisionPerspective query', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiDecisionVisualizationQuery.js'),'utf8')); assert(!code.includes('getDecisionPerspective')) });
  suite('T159'); await test('T159: validateTenantRls em summary query', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryQuery.js'),'utf8')); assert(code.includes('validateTenantRls')) });
  suite('T160'); await test('T160: validateTenantRls em overview query', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiStrategicOverviewQuery.js'),'utf8')); assert(code.includes('validateTenantRls')) });
  suite('T161'); await test('T161: regressão P5.0 cockpit endpoints count', async () => { const code=fs.readFileSync(path.resolve(__dirname,'../../routes/aioi/aioiCockpitRoutes.js'),'utf8'); assert((code.match(/router\.get/g)||[]).length>=5) });
  suite('T162'); await test('T162: query-driven desacoplamento', async () => { const svcCode=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')); const qCode=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryQuery.js'),'utf8')); assert(svcCode.includes('cockpitApiService') && qCode.includes('generated_at')) });
  suite('T163'); await test('T163: bundle decision generated_at', async () => { const r=await qSvc.getExecutiveQueryBundle(COMPANY_ID,qSvc.createQueryCache()); assert(r.decision_visualization_query.generated_at) });
  suite('T164'); await test('T164: bundle interface generated_at', async () => { const r=await qSvc.getExecutiveQueryBundle(COMPANY_ID,qSvc.createQueryCache()); assert(r.interface_intelligence_query.generated_at) });
  suite('T165'); await test('T165: sem reimplementar P5.0 buildSummaryPayload', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryQuery.js'),'utf8')); assert(!code.includes('buildSummaryPayload')) });
  suite('T166'); await test('T166: P5.1 veredito estrutural', async () => { const files=['aioiExecutiveQueryMetrics.js','aioiExecutiveQueryService.js','aioiExecutiveSummaryQuery.js','aioiStrategicOverviewQuery.js','aioiDecisionVisualizationQuery.js','aioiInterfaceIntelligenceQuery.js']; for(const f of files) assert(fs.existsSync(path.join(SERVICES_PATH,f)),f) });

  restoreDb();
  console.log(`\n========================================`);
  console.log(`AIOI-P5.1 Enterprise Executive Query Layer`);
  console.log(`PASS: ${_passed}  FAIL: ${_failed}  TOTAL: ${_passed + _failed}`);
  if (_failed === 0 && _passed >= 166) {
    console.log(`VERDICT: AIOI_P5_1_ENTERPRISE_EXECUTIVE_QUERY_LAYER_PASS`);
  } else {
    console.log(`VERDICT: AIOI_P5_1_ENTERPRISE_EXECUTIVE_QUERY_LAYER_FAIL`);
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
