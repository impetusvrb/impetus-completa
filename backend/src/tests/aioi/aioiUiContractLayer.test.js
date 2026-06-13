'use strict';

/**
 * AIOI-P5.2 — Testes automatizados da Enterprise Executive UI Contract Layer
 * T1–T171+ | node src/tests/aioi/aioiUiContractLayer.test.js
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
function restoreDb() { if (_originalDb) require.cache[DB_MOD_PATH] = { id: DB_MOD_PATH, filename: DB_MOD_PATH, loaded: true, exports: _originalDb }; }

const EXEC_QUERY_PATH = require.resolve(`${SERVICES_PATH}/aioiExecutiveQueryService`);
let queryBundleCallCount = 0;
const GENERATED_AT = '2026-06-07T12:00:00.000Z';

const SAMPLE_BUNDLE = {
  ok: true,
  executive_summary_query: { executive_summary: { summary_score: 85, summary_status: 'summary_ready' }, cockpit_readiness: { cockpit_score: 86, cockpit_level: 'executive_ready' }, generated_at: GENERATED_AT },
  strategic_overview_query: { strategic_overview: { overview_score: 84, overview_status: 'overview_ready' }, visualization_readiness: { visualization_score: 87, visualization_level: 'visualization_ready' }, generated_at: GENERATED_AT },
  decision_visualization_query: { decision_perspective: { perspective_score: 85, perspective_status: 'decision_ready' }, decision_consistency: { consistency_score: 84, consistency_status: 'consistent' }, decision_visualization_coverage: { coverage_score: 93, coverage_status: 'comprehensive' }, enterprise_decision_visualization: { visualization_score: 87, visualization_level: 'executive_visualization_ready' }, generated_at: GENERATED_AT },
  interface_intelligence_query: { interface_perspective: { perspective_score: 88, perspective_status: 'interface_ready' }, interface_consistency: { consistency_score: 86, consistency_status: 'consistent' }, interface_coverage: { coverage_score: 90, coverage_status: 'comprehensive' }, enterprise_interface_intelligence: { interface_score: 87, interface_level: 'interface_ready' }, generated_at: GENERATED_AT }
};

function installQueryMock() {
  queryBundleCallCount = 0;
  require.cache[EXEC_QUERY_PATH] = {
    id: EXEC_QUERY_PATH, filename: EXEC_QUERY_PATH, loaded: true,
    exports: {
      createQueryCache: () => ({ readModel: null, readModelPromise: null }),
      getExecutiveQueryBundle: async (cid) => {
        queryBundleCallCount++;
        if (!cid || !/^[0-9a-f-]{36}$/i.test(String(cid))) return { ok: false, error: 'companyId inválido' };
        return { ...SAMPLE_BUNDLE, executive_summary_query: { ...SAMPLE_BUNDLE.executive_summary_query } };
      }
    }
  };
}

function clearP52Cache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('aioiUiContract') || key.includes('UiContract') || key.includes('aioiExecutiveSummaryUi') || key.includes('aioiStrategicOverviewUi') || key.includes('aioiDecisionVisualizationUi') || key.includes('aioiInterfaceIntelligenceUi')) {
      delete require.cache[key];
    }
  }
}

let _svcCache = null;
function loadP52() {
  if (_svcCache) return _svcCache;
  installQueryMock();
  return _svcCache = {
    aioiUiContractMetrics: require(`${SERVICES_PATH}/aioiUiContractMetrics`),
    aioiUiContractService: require(`${SERVICES_PATH}/aioiUiContractService`),
    aioiExecutiveSummaryUiContract: require(`${SERVICES_PATH}/aioiExecutiveSummaryUiContract`),
    aioiStrategicOverviewUiContract: require(`${SERVICES_PATH}/aioiStrategicOverviewUiContract`),
    aioiDecisionVisualizationUiContract: require(`${SERVICES_PATH}/aioiDecisionVisualizationUiContract`),
    aioiInterfaceIntelligenceUiContract: require(`${SERVICES_PATH}/aioiInterfaceIntelligenceUiContract`)
  };
}
function reloadP52() { _svcCache = null; clearP52Cache(); delete require.cache[EXEC_QUERY_PATH]; return loadP52(); }

function stripComments(c) { return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); }
function assertNoWrites(calls) {
  for (const c of calls) {
    const s = c.sql.trim().toUpperCase();
    if (['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ALTER', 'DROP', 'CREATE', 'MERGE'].some(k => s.startsWith(k))) throw new Error(`escrita: ${c.sql.slice(0, 60)}`);
  }
}
function createReadinessDbMock() {
  const calls = [];
  const client = { _calls: calls, async query(sql, params) {
    calls.push({ sql: sql.trim(), params });
    if (['set_config', 'BEGIN', 'COMMIT', 'ROLLBACK'].some(k => sql.includes(k))) return { rows: [] };
    if (sql.includes('SELECT 1 AS rls_validated')) return { rows: [{ rls_validated: 1 }] };
    return { rows: [] };
  }, release: () => {} };
  return { pool: { connect: async () => client }, _client: client };
}

async function runTests() {
  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP52();
  const cSvc = svc.aioiUiContractService;
  let qm = svc.aioiUiContractMetrics;
  qm.resetSessionCounters();
  const sharedCache = cSvc.createContractCache();

  suite('T1'); await test('T1: assertReadOnlySql', async () => { assert(typeof qm.assertReadOnlySql==='function') });
  suite('T2'); await test('T2: INSERT bloqueado', async () => { let t=false;try{qm.assertReadOnlySql('INSERT INTO x VALUES (1)');}catch(e){t=true;assertEqual(e.message,'READ_ONLY_LAYER_VIOLATION','');}assert(t) });
  suite('T3'); await test('T3: UPDATE bloqueado', async () => { let t=false;try{qm.assertReadOnlySql('UPDATE x SET y=1');}catch(e){t=true;}assert(t) });
  suite('T4'); await test('T4: DELETE bloqueado', async () => { let t=false;try{qm.assertReadOnlySql('DELETE FROM x');}catch(e){t=true;}assert(t) });
  suite('T5'); await test('T5: TRUNCATE bloqueado', async () => { let t=false;try{qm.assertReadOnlySql('TRUNCATE TABLE x');}catch(e){t=true;}assert(t) });
  suite('T6'); await test('T6: CREATE bloqueado', async () => { let t=false;try{qm.assertReadOnlySql('CREATE TABLE x (id int)');}catch(e){t=true;}assert(t) });
  suite('T7'); await test('T7: DROP bloqueado', async () => { let t=false;try{qm.assertReadOnlySql('DROP TABLE x');}catch(e){t=true;}assert(t) });
  suite('T8'); await test('T8: ALTER bloqueado', async () => { let t=false;try{qm.assertReadOnlySql('ALTER TABLE x ADD y int');}catch(e){t=true;}assert(t) });
  suite('T9'); await test('T9: UPSERT bloqueado', async () => { let t=false;try{qm.assertReadOnlySql('UPSERT INTO x VALUES (1)');}catch(e){t=true;}assert(t) });
  suite('T10'); await test('T10: ON CONFLICT bloqueado', async () => { let t=false;try{qm.assertReadOnlySql('INSERT INTO x VALUES (1) ON CONFLICT DO NOTHING');}catch(e){t=true;assertEqual(e.message,'READ_ONLY_LAYER_VIOLATION','');}assert(t) });
  suite('T11'); await test('T11: MERGE bloqueado', async () => { let t=false;try{qm.assertReadOnlySql('MERGE INTO x');}catch(e){t=true;}assert(t) });
  suite('T12'); await test('T12: GRANT bloqueado', async () => { let t=false;try{qm.assertReadOnlySql('GRANT ALL ON x TO y');}catch(e){t=true;}assert(t) });
  suite('T13'); await test('T13: REVOKE bloqueado', async () => { let t=false;try{qm.assertReadOnlySql('REVOKE ALL ON x FROM y');}catch(e){t=true;}assert(t) });
  suite('T14'); await test('T14: recordUiContractRequested', async () => { qm.resetSessionCounters();qm.recordUiContractRequested(COMPANY_ID,'summary');assertEqual(qm.getSessionCounters().ui_contract_requests,1,'') });
  suite('T15'); await test('T15: recordUiContractCompleted latency', async () => { qm.recordUiContractCompleted(COMPANY_ID,'summary',33);assertEqual(qm.getSessionCounters().avg_query_latency_ms,33,'') });
  suite('T16'); await test('T16: recordExecutiveSummaryContract', async () => { qm.recordExecutiveSummaryContract(COMPANY_ID);assert(qm.getSessionCounters().executive_summary_contracts>=1) });
  suite('T17'); await test('T17: recordStrategicOverviewContract', async () => { qm.recordStrategicOverviewContract(COMPANY_ID);assert(qm.getSessionCounters().strategic_overview_contracts>=1) });
  suite('T18'); await test('T18: recordDecisionVisualizationContract', async () => { qm.recordDecisionVisualizationContract(COMPANY_ID);assert(qm.getSessionCounters().decision_visualization_contracts>=1) });
  suite('T19'); await test('T19: recordInterfaceIntelligenceContract', async () => { qm.recordInterfaceIntelligenceContract(COMPANY_ID);assert(qm.getSessionCounters().interface_intelligence_contracts>=1) });
  suite('T20'); await test('T20: getSessionCounters campos', async () => { qm.resetSessionCounters();const c=qm.getSessionCounters();assert('ui_contract_requests' in c&&'avg_query_latency_ms' in c) });
  suite('T21'); await test('T21: getExecutiveSummaryUiContract ok', async () => { const r=await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,sharedCache);assert(r.ok&&r.section==='executive_summary'&&r.data&&r.generated_at) });
  suite('T22'); await test('T22: getStrategicOverviewUiContract ok', async () => { const r=await cSvc.getStrategicOverviewUiContract(COMPANY_ID,sharedCache);assert(r.ok&&r.section==='strategic_overview'&&r.data&&r.generated_at) });
  suite('T23'); await test('T23: getDecisionVisualizationUiContract ok', async () => { const r=await cSvc.getDecisionVisualizationUiContract(COMPANY_ID,sharedCache);assert(r.ok&&r.section==='decision_visualization'&&r.data&&r.generated_at) });
  suite('T24'); await test('T24: getInterfaceIntelligenceUiContract ok', async () => { const r=await cSvc.getInterfaceIntelligenceUiContract(COMPANY_ID,sharedCache);assert(r.ok&&r.section==='interface_intelligence'&&r.data&&r.generated_at) });
  suite('T25'); await test('T25: getUiContractBundle ok', async () => { const r=await cSvc.getUiContractBundle(COMPANY_ID,sharedCache);assert(r.ok&&r.executive_summary_contract&&r.strategic_overview_contract&&r.decision_visualization_contract&&r.interface_intelligence_contract) });
  suite('T26'); await test('T26: companyId inválido summary', async () => { const r=await cSvc.getExecutiveSummaryUiContract('bad-id');assert(!r.ok) });
  suite('T27'); await test('T27: companyId inválido bundle', async () => { const r=await cSvc.getUiContractBundle('invalid');assert(!r.ok) });
  suite('T28'); await test('T28: buildExecutiveSummaryUiContract', async () => { const c=svc.aioiExecutiveSummaryUiContract.buildExecutiveSummaryUiContract(SAMPLE_BUNDLE.executive_summary_query);assertEqual(c.section,'executive_summary','');assertEqual(c.generated_at,GENERATED_AT,'') });
  suite('T29'); await test('T29: buildStrategicOverviewUiContract', async () => { const c=svc.aioiStrategicOverviewUiContract.buildStrategicOverviewUiContract(SAMPLE_BUNDLE.strategic_overview_query);assertEqual(c.section,'strategic_overview','') });
  suite('T30'); await test('T30: buildDecisionVisualizationUiContract', async () => { const c=svc.aioiDecisionVisualizationUiContract.buildDecisionVisualizationUiContract(SAMPLE_BUNDLE.decision_visualization_query);assertEqual(c.section,'decision_visualization','') });
  suite('T31'); await test('T31: buildInterfaceIntelligenceUiContract', async () => { const c=svc.aioiInterfaceIntelligenceUiContract.buildInterfaceIntelligenceUiContract(SAMPLE_BUNDLE.interface_intelligence_query);assertEqual(c.section,'interface_intelligence','') });
  suite('T32'); await test('T32: summary data executive_summary', async () => { const r=await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.executive_summary.summary_score,85,'') });
  suite('T33'); await test('T33: summary data cockpit_readiness', async () => { const r=await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.cockpit_readiness.cockpit_score,86,'') });
  suite('T34'); await test('T34: overview data strategic_overview', async () => { const r=await cSvc.getStrategicOverviewUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.strategic_overview.overview_score,84,'') });
  suite('T35'); await test('T35: overview data visualization_readiness', async () => { const r=await cSvc.getStrategicOverviewUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.visualization_readiness.visualization_level,'visualization_ready','') });
  suite('T36'); await test('T36: decision data perspective', async () => { const r=await cSvc.getDecisionVisualizationUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.decision_perspective.perspective_score,85,'') });
  suite('T37'); await test('T37: interface data interface_level', async () => { const r=await cSvc.getInterfaceIntelligenceUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.enterprise_interface_intelligence.interface_level,'interface_ready','') });
  suite('T38'); await test('T38: bundle summary section', async () => { const r=await cSvc.getUiContractBundle(COMPANY_ID,cSvc.createContractCache());assertEqual(r.executive_summary_contract.section,'executive_summary','') });
  suite('T39'); await test('T39: bundle overview section', async () => { const r=await cSvc.getUiContractBundle(COMPANY_ID,cSvc.createContractCache());assertEqual(r.strategic_overview_contract.section,'strategic_overview','') });
  suite('T40'); await test('T40: bundle decision section', async () => { const r=await cSvc.getUiContractBundle(COMPANY_ID,cSvc.createContractCache());assertEqual(r.decision_visualization_contract.section,'decision_visualization','') });
  suite('T41'); await test('T41: bundle interface section', async () => { const r=await cSvc.getUiContractBundle(COMPANY_ID,cSvc.createContractCache());assertEqual(r.interface_intelligence_contract.section,'interface_intelligence','') });
  suite('T42'); await test('T42: createContractCache isolado', async () => { const c1=cSvc.createContractCache();const c2=cSvc.createContractCache();assert(c1!==c2&&c1.queryCache) });
  suite('T43'); await test('T43: summary generated_at preserved', async () => { const r=await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.generated_at,GENERATED_AT,'') });
  suite('T44'); await test('T44: decision consistency in data', async () => { const r=await cSvc.getDecisionVisualizationUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.decision_consistency.consistency_status,'consistent','') });
  suite('T45'); await test('T45: interface coverage in data', async () => { const r=await cSvc.getInterfaceIntelligenceUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.interface_coverage.coverage_status,'comprehensive','') });
  suite('T46'); await test('T46: bundle sem ok nos sub-contracts', async () => { const r=await cSvc.getUiContractBundle(COMPANY_ID,cSvc.createContractCache());assert(!('ok' in r.executive_summary_contract)) });
  suite('T47'); await test('T47: decision coverage in data', async () => { const r=await cSvc.getDecisionVisualizationUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.decision_visualization_coverage.coverage_score,93,'') });
  suite('T48'); await test('T48: interface perspective in data', async () => { const r=await cSvc.getInterfaceIntelligenceUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.interface_perspective.perspective_score,88,'') });
  suite('T49'); await test('T49: summary ok true', async () => { const r=await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cSvc.createContractCache());assert(r.ok) });
  suite('T50'); await test('T50: overview ok true', async () => { const r=await cSvc.getStrategicOverviewUiContract(COMPANY_ID,cSvc.createContractCache());assert(r.ok) });
  suite('T51'); await test('T51: decision ok true', async () => { const r=await cSvc.getDecisionVisualizationUiContract(COMPANY_ID,cSvc.createContractCache());assert(r.ok) });
  suite('T52'); await test('T52: interface ok true', async () => { const r=await cSvc.getInterfaceIntelligenceUiContract(COMPANY_ID,cSvc.createContractCache());assert(r.ok) });
  suite('T53'); await test('T53: bundle ok true', async () => { const r=await cSvc.getUiContractBundle(COMPANY_ID,cSvc.createContractCache());assert(r.ok) });
  suite('T54'); await test('T54: bundle generated_at all', async () => { const r=await cSvc.getUiContractBundle(COMPANY_ID,cSvc.createContractCache());assert(r.executive_summary_contract.generated_at&&r.interface_intelligence_contract.generated_at) });
  suite('T55'); await test('T55: empty query graceful summary', async () => { const c=svc.aioiExecutiveSummaryUiContract.buildExecutiveSummaryUiContract({});assert(typeof c.data.executive_summary==='object') });
  suite('T56'); await test('T56: composição P5.1 summary', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryUiContract.js'),'utf8'));assert(code.includes('getExecutiveQueryBundle')&&!code.includes('getExecutiveSummaryQuery')) });
  suite('T57'); await test('T57: composição P5.1 overview', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiStrategicOverviewUiContract.js'),'utf8'));assert(code.includes('getExecutiveQueryBundle')&&!code.includes('getStrategicOverviewQuery')) });
  suite('T58'); await test('T58: composição P5.1 decision', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiDecisionVisualizationUiContract.js'),'utf8'));assert(code.includes('getExecutiveQueryBundle')&&!code.includes('getDecisionVisualizationQuery')) });
  suite('T59'); await test('T59: composição P5.1 interface', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiInterfaceIntelligenceUiContract.js'),'utf8'));assert(code.includes('getExecutiveQueryBundle')&&!code.includes('getInterfaceIntelligenceQuery')) });
  suite('T60'); await test('T60: sem P5.0 direto', async () => { const files=['aioiExecutiveSummaryUiContract.js','aioiUiContractService.js'];for(const f of files){const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,f),'utf8'));assert(!code.includes('cockpitApiService')&&!code.includes('getCockpitSummary'),f)} });
  suite('T61'); await test('T61: sem P4.6 direto', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8'));assert(!code.includes('getInterfaceIntelligenceReadModel')) });
  suite('T62'); await test('T62: sem P4.5 direto', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8'));assert(!code.includes('getDecisionVisualizationReadModel')) });
  suite('T63'); await test('T63: sem LLM/IA', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8'));assert(!code.includes('openai')&&!code.includes('generateText')) });
  suite('T64'); await test('T64: sem forecast', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8'));assert(!code.includes('getBacklogForecast')) });
  suite('T65'); await test('T65: sem execução', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8'));assert(!code.includes('executeDecision')) });
  suite('T66'); await test('T66: sem React/HTML/CSS', async () => { const files=['aioiUiContractService.js','aioiExecutiveSummaryUiContract.js'];for(const f of files){const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,f),'utf8'));assert(!code.includes('React')&&!code.includes('HTML')&&!code.includes('CSS')&&!code.includes('JSX')&&!code.includes('TSX'),f)} });
  suite('T67'); await test('T67: sem APIs novas', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8'));assert(!code.includes('express.Router')&&!code.includes('router.get')) });
  suite('T68'); await test('T68: sem Chart/widget', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8'));assert(!code.includes('Chart.js')&&!code.includes('renderChart')) });
  suite('T69'); await test('T69: fan-out bundle shared cache', async () => { queryBundleCallCount=0;const cache=cSvc.createContractCache();await cSvc.getUiContractBundle(COMPANY_ID,cache);assertEqual(queryBundleCallCount,1,'single bundle') });
  suite('T70'); await test('T70: fan-out summary+overview cache', async () => { queryBundleCallCount=0;const cache=cSvc.createContractCache();await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cache);await cSvc.getStrategicOverviewUiContract(COMPANY_ID,cache);assertEqual(queryBundleCallCount,1,'') });
  suite('T71'); await test('T71: fan-out all contracts cache', async () => { queryBundleCallCount=0;const cache=cSvc.createContractCache();await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cache);await cSvc.getStrategicOverviewUiContract(COMPANY_ID,cache);await cSvc.getDecisionVisualizationUiContract(COMPANY_ID,cache);await cSvc.getInterfaceIntelligenceUiContract(COMPANY_ID,cache);assertEqual(queryBundleCallCount,1,'') });
  suite('T72'); await test('T72: independent cache fan-out', async () => { queryBundleCallCount=0;await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cSvc.createContractCache());await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(queryBundleCallCount,2,'') });
  suite('T73'); await test('T73: getExecutiveQueryBundle uma vez summary', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryUiContract.js'),'utf8'));assertEqual((code.match(/getExecutiveQueryBundle/g)||[]).length,1,'') });
  suite('T74'); await test('T74: build* local contracts', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8'));assert(code.includes('buildExecutiveSummaryUiContract')&&code.includes('getUiContractBundle')) });
  suite('T75'); await test('T75: 6 arquivos P5.2 existem', async () => { const files=['aioiUiContractMetrics.js','aioiUiContractService.js','aioiExecutiveSummaryUiContract.js','aioiStrategicOverviewUiContract.js','aioiDecisionVisualizationUiContract.js','aioiInterfaceIntelligenceUiContract.js'];for(const f of files)assert(fs.existsSync(path.join(SERVICES_PATH,f)),f) });
  suite('T76'); await test('T76: sem getCockpitOverview', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiStrategicOverviewUiContract.js'),'utf8'));assert(!code.includes('getCockpitOverview')) });
  suite('T77'); await test('T77: sem buildExecutiveSummaryQuery', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryUiContract.js'),'utf8'));assert(!code.includes('buildExecutiveSummaryQuery')) });
  suite('T78'); await test('T78: executiveQueryService import', async () => { const code=fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8');assert(code.includes('aioiExecutiveQueryService')) });
  suite('T79'); await test('T79: soberanos ausentes', async () => { const forbidden=['operationalDecisionEngine','workflowOrchestrator','actionRuntimeOrchestrator'];const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8'));for(const bad of forbidden)assert(!code.includes(bad)) });
  suite('T80'); await test('T80: sem scoring novo', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractMetrics.js'),'utf8'));assert(!code.includes('computePriorityScore')) });
  suite('T81'); await test('T81: RLS company_id', async () => { await qm.validateTenantRls(COMPANY_ID);const t=mock._client._calls.find(c=>c.sql.includes('app.current_company_id'));assert(t&&t.params[0]===COMPANY_ID) });
  suite('T82'); await test('T82: RLS bypass false', async () => { await qm.validateTenantRls(COMPANY_ID);assert(mock._client._calls.filter(c=>c.sql.includes('app.bypass_rls')).length>=1) });
  suite('T83'); await test('T83: zero writes RLS', async () => { assertNoWrites(mock._client._calls) });
  suite('T84'); await test('T84: tenant B RLS', async () => { await qm.validateTenantRls(COMPANY_ID_B);assert(mock._client._calls.find(c=>c.params&&c.params[0]===COMPANY_ID_B),'tenant B') });
  suite('T85'); await test('T85: tenant B summary contract', async () => { const r=await cSvc.getExecutiveSummaryUiContract(COMPANY_ID_B,cSvc.createContractCache());assert(r.ok) });
  suite('T86'); await test('T86: recordError', async () => { qm.recordError(COMPANY_ID,'test','err');assert(qm.getSessionCounters().ui_contract_error_count>=1) });
  suite('T87'); await test('T87: summary metric increment', async () => { qm.resetSessionCounters();await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cSvc.createContractCache());assert(qm.getSessionCounters().executive_summary_contracts>=1) });
  suite('T88'); await test('T88: overview metric increment', async () => { qm.resetSessionCounters();await cSvc.getStrategicOverviewUiContract(COMPANY_ID,cSvc.createContractCache());assert(qm.getSessionCounters().strategic_overview_contracts>=1) });
  suite('T89'); await test('T89: decision metric increment', async () => { qm.resetSessionCounters();await cSvc.getDecisionVisualizationUiContract(COMPANY_ID,cSvc.createContractCache());assert(qm.getSessionCounters().decision_visualization_contracts>=1) });
  suite('T90'); await test('T90: interface metric increment', async () => { qm.resetSessionCounters();await cSvc.getInterfaceIntelligenceUiContract(COMPANY_ID,cSvc.createContractCache());assert(qm.getSessionCounters().interface_intelligence_contracts>=1) });
  suite('T91'); await test('T91: ui_contract_requests counter', async () => { qm.resetSessionCounters();await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cSvc.createContractCache());assert(qm.getSessionCounters().ui_contract_requests>=1) });
  suite('T92'); await test('T92: log REQUESTED', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractMetrics.js'),'utf8').includes('AIOI_UI_CONTRACT_REQUESTED')) });
  suite('T93'); await test('T93: log COMPLETED', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractMetrics.js'),'utf8').includes('AIOI_UI_CONTRACT_COMPLETED')) });
  suite('T94'); await test('T94: log ERROR', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractMetrics.js'),'utf8').includes('AIOI_UI_CONTRACT_ERROR')) });
  suite('T95'); await test('T95: métrica ui_contract_requests', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractMetrics.js'),'utf8').includes('ui_contract_requests')) });
  suite('T96'); await test('T96: métrica executive_summary_contracts', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractMetrics.js'),'utf8').includes('executive_summary_contracts')) });
  suite('T97'); await test('T97: métrica strategic_overview_contracts', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractMetrics.js'),'utf8').includes('strategic_overview_contracts')) });
  suite('T98'); await test('T98: métrica decision_visualization_contracts', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractMetrics.js'),'utf8').includes('decision_visualization_contracts')) });
  suite('T99'); await test('T99: métrica interface_intelligence_contracts', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractMetrics.js'),'utf8').includes('interface_intelligence_contracts')) });
  suite('T100'); await test('T100: métrica avg_query_latency_ms', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractMetrics.js'),'utf8').includes('avg_query_latency_ms')) });
  suite('T101'); await test('T101: validateTenantRls export', async () => { assert(typeof qm.validateTenantRls==='function') });
  suite('T102'); await test('T102: LAYER constant', async () => { assertEqual(qm.LAYER,'AIOI_UI_CONTRACT_METRICS','') });
  suite('T103'); await test('T103: validateTenantRls summary', async () => { assert(stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryUiContract.js'),'utf8')).includes('validateTenantRls')) });
  suite('T104'); await test('T104: resetSessionCounters', async () => { qm.resetSessionCounters();assertEqual(qm.getSessionCounters().ui_contract_requests,0,'') });
  suite('T105'); await test('T105: withTenantReadClient export', async () => { assert(typeof qm.withTenantReadClient==='function') });
  suite('T106'); await test('T106: regressão P5.1 query service intacto', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8').includes('getExecutiveQueryBundle')) });
  suite('T107'); await test('T107: regressão P5.1 query metrics', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryMetrics.js'),'utf8').includes('AIOI_EXECUTIVE_QUERY_REQUESTED')) });
  suite('T108'); await test('T108: regressão P5.1 summary query', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryQuery.js'),'utf8').includes('getExecutiveSummaryQuery')) });
  suite('T109'); await test('T109: regressão P5.1 report exists', async () => { assert(fs.existsSync(path.resolve(__dirname,'../../../docs/AIOI_P5_1_ENTERPRISE_EXECUTIVE_QUERY_LAYER_REPORT.md'))) });
  suite('T110'); await test('T110: regressão P5.1 createQueryCache', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8').includes('createQueryCache')) });
  suite('T111'); await test('T111: contrato section executive_summary', async () => { const r=await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.section,'executive_summary','') });
  suite('T112'); await test('T112: contrato section strategic_overview', async () => { const r=await cSvc.getStrategicOverviewUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.section,'strategic_overview','') });
  suite('T113'); await test('T113: contrato section decision_visualization', async () => { const r=await cSvc.getDecisionVisualizationUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.section,'decision_visualization','') });
  suite('T114'); await test('T114: contrato section interface_intelligence', async () => { const r=await cSvc.getInterfaceIntelligenceUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.section,'interface_intelligence','') });
  suite('T115'); await test('T115: contrato bundle keys', async () => { const r=await cSvc.getUiContractBundle(COMPANY_ID,cSvc.createContractCache());assert('executive_summary_contract' in r&&'interface_intelligence_contract' in r) });
  suite('T116'); await test('T116: contrato data wrapper summary', async () => { const r=await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cSvc.createContractCache());assert('data' in r&&typeof r.data==='object') });
  suite('T117'); await test('T117: contrato data wrapper overview', async () => { const r=await cSvc.getStrategicOverviewUiContract(COMPANY_ID,cSvc.createContractCache());assert('data' in r) });
  suite('T118'); await test('T118: contrato data wrapper decision', async () => { const r=await cSvc.getDecisionVisualizationUiContract(COMPANY_ID,cSvc.createContractCache());assert('data' in r&&'decision_perspective' in r.data) });
  suite('T119'); await test('T119: contrato data wrapper interface', async () => { const r=await cSvc.getInterfaceIntelligenceUiContract(COMPANY_ID,cSvc.createContractCache());assert('data' in r&&'interface_perspective' in r.data) });
  suite('T120'); await test('T120: determinístico build summary', async () => { const c1=svc.aioiExecutiveSummaryUiContract.buildExecutiveSummaryUiContract(SAMPLE_BUNDLE.executive_summary_query);const c2=svc.aioiExecutiveSummaryUiContract.buildExecutiveSummaryUiContract(SAMPLE_BUNDLE.executive_summary_query);assertEqual(c1.data.executive_summary.summary_score,c2.data.executive_summary.summary_score,'') });
  suite('T121'); await test('T121: determinístico build overview', async () => { const c1=svc.aioiStrategicOverviewUiContract.buildStrategicOverviewUiContract(SAMPLE_BUNDLE.strategic_overview_query);const c2=svc.aioiStrategicOverviewUiContract.buildStrategicOverviewUiContract(SAMPLE_BUNDLE.strategic_overview_query);assertEqual(c1.data.strategic_overview.overview_score,c2.data.strategic_overview.overview_score,'') });
  suite('T122'); await test('T122: sem Vue/Angular', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8'));assert(!code.includes('Vue')&&!code.includes('Angular')) });
  suite('T123'); await test('T123: sem automation runtime', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8'));assert(!code.includes('actionRuntime')) });
  suite('T124'); await test('T124: P5.2 ADDITIVE ONLY', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8'));assert(!code.includes('INSERT INTO')) });
  suite('T125'); await test('T125: exports getUiContractBundle', async () => { assert(typeof cSvc.getUiContractBundle==='function') });
  suite('T126'); await test('T126: exports buildDecisionVisualizationUiContract', async () => { assert(typeof cSvc.buildDecisionVisualizationUiContract==='function') });
  suite('T127'); await test('T127: bundle summary nested score', async () => { const r=await cSvc.getUiContractBundle(COMPANY_ID,cSvc.createContractCache());assertEqual(r.executive_summary_contract.data.executive_summary.summary_score,85,'') });
  suite('T128'); await test('T128: bundle overview nested score', async () => { const r=await cSvc.getUiContractBundle(COMPANY_ID,cSvc.createContractCache());assertEqual(r.strategic_overview_contract.data.strategic_overview.overview_score,84,'') });
  suite('T129'); await test('T129: bundle decision nested', async () => { const r=await cSvc.getUiContractBundle(COMPANY_ID,cSvc.createContractCache());assertEqual(r.decision_visualization_contract.data.decision_perspective.perspective_score,85,'') });
  suite('T130'); await test('T130: bundle interface nested', async () => { const r=await cSvc.getUiContractBundle(COMPANY_ID,cSvc.createContractCache());assertEqual(r.interface_intelligence_contract.data.enterprise_interface_intelligence.interface_score,87,'') });
  suite('T131'); await test('T131: companyId inválido decision', async () => { const r=await cSvc.getDecisionVisualizationUiContract('x');assert(!r.ok) });
  suite('T132'); await test('T132: companyId inválido interface', async () => { const r=await cSvc.getInterfaceIntelligenceUiContract(null);assert(!r.ok) });
  suite('T133'); await test('T133: companyId inválido overview', async () => { const r=await cSvc.getStrategicOverviewUiContract('');assert(!r.ok) });
  suite('T134'); await test('T134: loadQueryBundle export', async () => { assert(typeof cSvc.loadQueryBundle==='function') });
  suite('T135'); await test('T135: regressão P5.1 bundle structure', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8').includes('executive_summary_query')) });
  suite('T136'); await test('T136: sem getAutonomyReadModel', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8')).includes('getAutonomyReadModel')) });
  suite('T137'); await test('T137: sem getVisualizationReadModel', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8')).includes('getVisualizationReadModel')) });
  suite('T138'); await test('T138: sem getConsumptionReadModel', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8')).includes('getConsumptionReadModel')) });
  suite('T139'); await test('T139: UI contract desacoplamento', async () => { const r=await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cSvc.createContractCache());assert(r.section&&r.data&&!r.executive_summary_query) });
  suite('T140'); await test('T140: bundle desacoplamento', async () => { const r=await cSvc.getUiContractBundle(COMPANY_ID,cSvc.createContractCache());assert(r.executive_summary_contract&&!r.executive_summary_query) });
  suite('T141'); await test('T141: cockpit readiness level', async () => { const r=await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.cockpit_readiness.cockpit_level,'executive_ready','') });
  suite('T142'); await test('T142: enterprise decision viz level', async () => { const r=await cSvc.getDecisionVisualizationUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.enterprise_decision_visualization.visualization_level,'executive_visualization_ready','') });
  suite('T143'); await test('T143: interface consistency status', async () => { const r=await cSvc.getInterfaceIntelligenceUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.interface_consistency.consistency_status,'consistent','') });
  suite('T144'); await test('T144: readQuery export', async () => { assert(typeof qm.readQuery==='function') });
  suite('T145'); await test('T145: recordUiContractCompleted bundle', async () => { qm.resetSessionCounters();qm.recordUiContractCompleted(COMPANY_ID,'bundle',25);assert(qm.getSessionCounters().avg_query_latency_ms===25) });
  suite('T146'); await test('T146: regressão P5.1 READ ONLY', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8')).includes('INSERT INTO')) });
  suite('T147'); await test('T147: regressão P5.0 intacto', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiCockpitApiService.js'),'utf8').includes('getCockpitSummary')) });
  suite('T148'); await test('T148: report doc P5.2', async () => { assert(fs.existsSync(path.resolve(__dirname,'../../../docs/AIOI_P5_2_ENTERPRISE_EXECUTIVE_UI_CONTRACT_LAYER_REPORT.md'))) });
  suite('T149'); await test('T149: sem UI components', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8')).includes('createDashboard')) });
  suite('T150'); await test('T150: sem reimplementar P5.1 build', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryUiContract.js'),'utf8')).includes('buildExecutiveSummaryQuery')) });
  suite('T151'); await test('T151: getExecutiveQueryBundle service', async () => { assertEqual((stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8')).match(/getExecutiveQueryBundle/g)||[]).length,1,'service') });
  suite('T152'); await test('T152: exports getExecutiveSummaryUiContract', async () => { assert(typeof cSvc.getExecutiveSummaryUiContract==='function') });
  suite('T153'); await test('T153: exports getInterfaceIntelligenceUiContract', async () => { assert(typeof cSvc.getInterfaceIntelligenceUiContract==='function') });
  suite('T154'); await test('T154: exports getDecisionVisualizationUiContract', async () => { assert(typeof cSvc.getDecisionVisualizationUiContract==='function') });
  suite('T155'); await test('T155: exports getStrategicOverviewUiContract', async () => { assert(typeof cSvc.getStrategicOverviewUiContract==='function') });
  suite('T156'); await test('T156: exports buildInterfaceIntelligenceUiContract', async () => { assert(typeof cSvc.buildInterfaceIntelligenceUiContract==='function') });
  suite('T157'); await test('T157: determinístico build decision', async () => { const c1=svc.aioiDecisionVisualizationUiContract.buildDecisionVisualizationUiContract(SAMPLE_BUNDLE.decision_visualization_query);const c2=svc.aioiDecisionVisualizationUiContract.buildDecisionVisualizationUiContract(SAMPLE_BUNDLE.decision_visualization_query);assertEqual(c1.data.decision_perspective.perspective_score,c2.data.decision_perspective.perspective_score,'') });
  suite('T158'); await test('T158: determinístico build interface', async () => { const c1=svc.aioiInterfaceIntelligenceUiContract.buildInterfaceIntelligenceUiContract(SAMPLE_BUNDLE.interface_intelligence_query);const c2=svc.aioiInterfaceIntelligenceUiContract.buildInterfaceIntelligenceUiContract(SAMPLE_BUNDLE.interface_intelligence_query);assertEqual(c1.data.interface_perspective.perspective_score,c2.data.interface_perspective.perspective_score,'') });
  suite('T159'); await test('T159: regressão P5.1 strategic query file', async () => { assert(fs.existsSync(path.join(SERVICES_PATH,'aioiStrategicOverviewQuery.js'))) });
  suite('T160'); await test('T160: regressão P5.1 interface query file', async () => { assert(fs.existsSync(path.join(SERVICES_PATH,'aioiInterfaceIntelligenceQuery.js'))) });
  suite('T161'); await test('T161: regressão P5.1 decision query file', async () => { assert(fs.existsSync(path.join(SERVICES_PATH,'aioiDecisionVisualizationQuery.js'))) });
  suite('T162'); await test('T162: bundle metric counts on bundle', async () => { qm.resetSessionCounters();await cSvc.getUiContractBundle(COMPANY_ID,cSvc.createContractCache());assert(qm.getSessionCounters().executive_summary_contracts>=1&&qm.getSessionCounters().interface_intelligence_contracts>=1) });
  suite('T163'); await test('T163: summary status in data', async () => { const r=await cSvc.getExecutiveSummaryUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.executive_summary.summary_status,'summary_ready','') });
  suite('T164'); await test('T164: overview status in data', async () => { const r=await cSvc.getStrategicOverviewUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.strategic_overview.overview_status,'overview_ready','') });
  suite('T165'); await test('T165: decision perspective status', async () => { const r=await cSvc.getDecisionVisualizationUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.decision_perspective.perspective_status,'decision_ready','') });
  suite('T166'); await test('T166: interface perspective status', async () => { const r=await cSvc.getInterfaceIntelligenceUiContract(COMPANY_ID,cSvc.createContractCache());assertEqual(r.data.interface_perspective.perspective_status,'interface_ready','') });
  suite('T167'); await test('T167: sem getCockpitReadModel', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8')).includes('getCockpitReadModel')) });
  suite('T168'); await test('T168: sem HTML em metrics', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractMetrics.js'),'utf8')).includes('<div')) });
  suite('T169'); await test('T169: createContractCache queryCache', async () => { const c=cSvc.createContractCache();assert(c.queryCache&&c.bundle===null) });
  suite('T170'); await test('T170: regressão P5.1 test file exists', async () => { assert(fs.existsSync(path.resolve(__dirname,'aioiExecutiveQueryLayer.test.js'))) });
  suite('T171'); await test('T171: P5.2 veredito estrutural', async () => { const files=['aioiUiContractMetrics.js','aioiUiContractService.js','aioiExecutiveSummaryUiContract.js','aioiStrategicOverviewUiContract.js','aioiDecisionVisualizationUiContract.js','aioiInterfaceIntelligenceUiContract.js'];for(const f of files)assert(fs.existsSync(path.join(SERVICES_PATH,f)),f) });

  restoreDb();
  console.log(`\n========================================`);
  console.log(`AIOI-P5.2 Enterprise Executive UI Contract Layer`);
  console.log(`PASS: ${_passed}  FAIL: ${_failed}  TOTAL: ${_passed + _failed}`);
  if (_failed === 0 && _passed >= 171) {
    console.log(`VERDICT: AIOI_P5_2_ENTERPRISE_EXECUTIVE_UI_CONTRACT_LAYER_PASS`);
  } else {
    console.log(`VERDICT: AIOI_P5_2_ENTERPRISE_EXECUTIVE_UI_CONTRACT_LAYER_FAIL`);
    process.exitCode = 1;
  }
}

runTests().catch(err => { console.error(err); process.exitCode = 1; });
