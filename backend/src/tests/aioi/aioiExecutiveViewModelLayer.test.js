'use strict';

/**
 * AIOI-P5.3 — Testes automatizados da Enterprise Executive View Model Layer
 * T1–T176+ | node src/tests/aioi/aioiExecutiveViewModelLayer.test.js
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

const UI_CONTRACT_PATH = require.resolve(`${SERVICES_PATH}/aioiUiContractService`);
let uiContractBundleCallCount = 0;
const GENERATED_AT = '2026-06-07T14:00:00.000Z';

const SAMPLE_UI_BUNDLE = {
  ok: true,
  executive_summary_contract: { section: 'executive_summary', data: { executive_summary: { summary_score: 85, summary_status: 'summary_ready' }, cockpit_readiness: { cockpit_score: 86, cockpit_level: 'executive_ready' } }, generated_at: GENERATED_AT },
  strategic_overview_contract: { section: 'strategic_overview', data: { strategic_overview: { overview_score: 84, overview_status: 'overview_ready' }, visualization_readiness: { visualization_score: 87, visualization_level: 'visualization_ready' } }, generated_at: GENERATED_AT },
  decision_visualization_contract: { section: 'decision_visualization', data: { decision_perspective: { perspective_score: 85, perspective_status: 'decision_ready' }, decision_consistency: { consistency_score: 84, consistency_status: 'consistent' }, decision_visualization_coverage: { coverage_score: 93, coverage_status: 'comprehensive' }, enterprise_decision_visualization: { visualization_score: 87, visualization_level: 'executive_visualization_ready' } }, generated_at: GENERATED_AT },
  interface_intelligence_contract: { section: 'interface_intelligence', data: { interface_perspective: { perspective_score: 88, perspective_status: 'interface_ready' }, interface_consistency: { consistency_score: 86, consistency_status: 'consistent' }, interface_coverage: { coverage_score: 90, coverage_status: 'comprehensive' }, enterprise_interface_intelligence: { interface_score: 87, interface_level: 'interface_ready' } }, generated_at: GENERATED_AT }
};

function installUiContractMock() {
  uiContractBundleCallCount = 0;
  require.cache[UI_CONTRACT_PATH] = {
    id: UI_CONTRACT_PATH, filename: UI_CONTRACT_PATH, loaded: true,
    exports: {
      createContractCache: () => ({ queryCache: {}, bundle: null, bundlePromise: null }),
      getUiContractBundle: async (cid) => {
        uiContractBundleCallCount++;
        if (!cid || !/^[0-9a-f-]{36}$/i.test(String(cid))) return { ok: false, error: 'companyId inválido' };
        return { ...SAMPLE_UI_BUNDLE };
      }
    }
  };
}

function clearP53Cache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('ViewModel') || key.includes('aioiExecutiveViewModel')) delete require.cache[key];
  }
}

let _svcCache = null;
function loadP53() {
  if (_svcCache) return _svcCache;
  installUiContractMock();
  return _svcCache = {
    aioiExecutiveViewModelMetrics: require(`${SERVICES_PATH}/aioiExecutiveViewModelMetrics`),
    aioiExecutiveViewModelService: require(`${SERVICES_PATH}/aioiExecutiveViewModelService`),
    aioiExecutiveSummaryViewModel: require(`${SERVICES_PATH}/aioiExecutiveSummaryViewModel`),
    aioiStrategicOverviewViewModel: require(`${SERVICES_PATH}/aioiStrategicOverviewViewModel`),
    aioiDecisionVisualizationViewModel: require(`${SERVICES_PATH}/aioiDecisionVisualizationViewModel`),
    aioiInterfaceIntelligenceViewModel: require(`${SERVICES_PATH}/aioiInterfaceIntelligenceViewModel`)
  };
}
function reloadP53() { _svcCache = null; clearP53Cache(); delete require.cache[UI_CONTRACT_PATH]; return loadP53(); }

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
  const svc = reloadP53();
  const vSvc = svc.aioiExecutiveViewModelService;
  let vm = svc.aioiExecutiveViewModelMetrics;
  vm.resetSessionCounters();
  const sharedCache = vSvc.createViewModelCache();

  suite('T1'); await test('T1: assertReadOnlySql', async () => { assert(typeof vm.assertReadOnlySql==='function') });
  suite('T2'); await test('T2: INSERT bloqueado', async () => { let x=false;try{vm.assertReadOnlySql('INSERT INTO x VALUES (1)');}catch(e){x=true;assertEqual(e.message,'READ_ONLY_LAYER_VIOLATION','');}assert(x) });
  suite('T3'); await test('T3: UPDATE bloqueado', async () => { let x=false;try{vm.assertReadOnlySql('UPDATE x SET y=1');}catch(e){x=true;}assert(x) });
  suite('T4'); await test('T4: DELETE bloqueado', async () => { let x=false;try{vm.assertReadOnlySql('DELETE FROM x');}catch(e){x=true;}assert(x) });
  suite('T5'); await test('T5: TRUNCATE bloqueado', async () => { let x=false;try{vm.assertReadOnlySql('TRUNCATE TABLE x');}catch(e){x=true;}assert(x) });
  suite('T6'); await test('T6: CREATE bloqueado', async () => { let x=false;try{vm.assertReadOnlySql('CREATE TABLE x (id int)');}catch(e){x=true;}assert(x) });
  suite('T7'); await test('T7: DROP bloqueado', async () => { let x=false;try{vm.assertReadOnlySql('DROP TABLE x');}catch(e){x=true;}assert(x) });
  suite('T8'); await test('T8: ALTER bloqueado', async () => { let x=false;try{vm.assertReadOnlySql('ALTER TABLE x ADD y int');}catch(e){x=true;}assert(x) });
  suite('T9'); await test('T9: UPSERT bloqueado', async () => { let x=false;try{vm.assertReadOnlySql('UPSERT INTO x VALUES (1)');}catch(e){x=true;}assert(x) });
  suite('T10'); await test('T10: ON CONFLICT bloqueado', async () => { let x=false;try{vm.assertReadOnlySql('INSERT INTO x VALUES (1) ON CONFLICT DO NOTHING');}catch(e){x=true;assertEqual(e.message,'READ_ONLY_LAYER_VIOLATION','');}assert(x) });
  suite('T11'); await test('T11: MERGE bloqueado', async () => { let x=false;try{vm.assertReadOnlySql('MERGE INTO x');}catch(e){x=true;}assert(x) });
  suite('T12'); await test('T12: GRANT bloqueado', async () => { let x=false;try{vm.assertReadOnlySql('GRANT ALL ON x TO y');}catch(e){x=true;}assert(x) });
  suite('T13'); await test('T13: REVOKE bloqueado', async () => { let x=false;try{vm.assertReadOnlySql('REVOKE ALL ON x FROM y');}catch(e){x=true;}assert(x) });
  suite('T14'); await test('T14: recordViewModelRequested', async () => { vm.resetSessionCounters();vm.recordViewModelRequested(COMPANY_ID,'summary');assertEqual(vm.getSessionCounters().view_model_requests,1,'') });
  suite('T15'); await test('T15: recordViewModelCompleted latency', async () => { vm.recordViewModelCompleted(COMPANY_ID,'summary',28);assertEqual(vm.getSessionCounters().avg_query_latency_ms,28,'') });
  suite('T16'); await test('T16: recordExecutiveSummaryViewModel', async () => { vm.recordExecutiveSummaryViewModel(COMPANY_ID);assert(vm.getSessionCounters().executive_summary_view_models>=1) });
  suite('T17'); await test('T17: recordStrategicOverviewViewModel', async () => { vm.recordStrategicOverviewViewModel(COMPANY_ID);assert(vm.getSessionCounters().strategic_overview_view_models>=1) });
  suite('T18'); await test('T18: recordDecisionVisualizationViewModel', async () => { vm.recordDecisionVisualizationViewModel(COMPANY_ID);assert(vm.getSessionCounters().decision_visualization_view_models>=1) });
  suite('T19'); await test('T19: recordInterfaceIntelligenceViewModel', async () => { vm.recordInterfaceIntelligenceViewModel(COMPANY_ID);assert(vm.getSessionCounters().interface_intelligence_view_models>=1) });
  suite('T20'); await test('T20: getSessionCounters campos', async () => { vm.resetSessionCounters();const c=vm.getSessionCounters();assert('view_model_requests' in c&&'avg_query_latency_ms' in c) });
  suite('T21'); await test('T21: getExecutiveSummaryViewModel ok', async () => { const r=await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,sharedCache);assert(r.ok&&r.view==='executive_summary'&&r.title&&r.contract&&r.generated_at) });
  suite('T22'); await test('T22: getStrategicOverviewViewModel ok', async () => { const r=await vSvc.getStrategicOverviewViewModel(COMPANY_ID,sharedCache);assert(r.ok&&r.view==='strategic_overview'&&r.contract&&r.generated_at) });
  suite('T23'); await test('T23: getDecisionVisualizationViewModel ok', async () => { const r=await vSvc.getDecisionVisualizationViewModel(COMPANY_ID,sharedCache);assert(r.ok&&r.view==='decision_visualization'&&r.contract&&r.generated_at) });
  suite('T24'); await test('T24: getInterfaceIntelligenceViewModel ok', async () => { const r=await vSvc.getInterfaceIntelligenceViewModel(COMPANY_ID,sharedCache);assert(r.ok&&r.view==='interface_intelligence'&&r.contract&&r.generated_at) });
  suite('T25'); await test('T25: getExecutiveViewModelBundle ok', async () => { const r=await vSvc.getExecutiveViewModelBundle(COMPANY_ID,sharedCache);assert(r.ok&&r.executive_summary_view_model&&r.strategic_overview_view_model&&r.decision_visualization_view_model&&r.interface_intelligence_view_model) });
  suite('T26'); await test('T26: companyId inválido summary', async () => { const r=await vSvc.getExecutiveSummaryViewModel('bad-id');assert(!r.ok) });
  suite('T27'); await test('T27: companyId inválido bundle', async () => { const r=await vSvc.getExecutiveViewModelBundle('invalid');assert(!r.ok) });
  suite('T28'); await test('T28: buildExecutiveSummaryViewModel', async () => { const v=svc.aioiExecutiveSummaryViewModel.buildExecutiveSummaryViewModel(SAMPLE_UI_BUNDLE.executive_summary_contract);assertEqual(v.view,'executive_summary','');assertEqual(v.title,'Executive Summary','') });
  suite('T29'); await test('T29: buildStrategicOverviewViewModel', async () => { const v=svc.aioiStrategicOverviewViewModel.buildStrategicOverviewViewModel(SAMPLE_UI_BUNDLE.strategic_overview_contract);assertEqual(v.view,'strategic_overview','') });
  suite('T30'); await test('T30: buildDecisionVisualizationViewModel', async () => { const v=svc.aioiDecisionVisualizationViewModel.buildDecisionVisualizationViewModel(SAMPLE_UI_BUNDLE.decision_visualization_contract);assertEqual(v.title,'Decision Visualization','') });
  suite('T31'); await test('T31: buildInterfaceIntelligenceViewModel', async () => { const v=svc.aioiInterfaceIntelligenceViewModel.buildInterfaceIntelligenceViewModel(SAMPLE_UI_BUNDLE.interface_intelligence_contract);assertEqual(v.view,'interface_intelligence','') });
  suite('T32'); await test('T32: summary title', async () => { const r=await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.title,'Executive Summary','') });
  suite('T33'); await test('T33: overview title', async () => { const r=await vSvc.getStrategicOverviewViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.title,'Strategic Overview','') });
  suite('T34'); await test('T34: decision title', async () => { const r=await vSvc.getDecisionVisualizationViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.title,'Decision Visualization','') });
  suite('T35'); await test('T35: interface title', async () => { const r=await vSvc.getInterfaceIntelligenceViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.title,'Interface Intelligence','') });
  suite('T36'); await test('T36: summary contract nested', async () => { const r=await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.executive_summary.summary_score,85,'') });
  suite('T37'); await test('T37: overview contract nested', async () => { const r=await vSvc.getStrategicOverviewViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.strategic_overview.overview_score,84,'') });
  suite('T38'); await test('T38: decision contract nested', async () => { const r=await vSvc.getDecisionVisualizationViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.decision_perspective.perspective_score,85,'') });
  suite('T39'); await test('T39: interface contract nested', async () => { const r=await vSvc.getInterfaceIntelligenceViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.enterprise_interface_intelligence.interface_score,87,'') });
  suite('T40'); await test('T40: generated_at preserved', async () => { const r=await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.generated_at,GENERATED_AT,'') });
  suite('T41'); await test('T41: bundle view keys', async () => { const r=await vSvc.getExecutiveViewModelBundle(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.executive_summary_view_model.view,'executive_summary','') });
  suite('T42'); await test('T42: bundle sem ok sub-models', async () => { const r=await vSvc.getExecutiveViewModelBundle(COMPANY_ID,vSvc.createViewModelCache());assert(!('ok' in r.executive_summary_view_model)) });
  suite('T43'); await test('T43: createViewModelCache isolado', async () => { const c1=vSvc.createViewModelCache();const c2=vSvc.createViewModelCache();assert(c1!==c2&&c1.contractCache) });
  suite('T44'); await test('T44: contract section preserved', async () => { const r=await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.section,'executive_summary','') });
  suite('T45'); await test('T45: summary ok true', async () => { const r=await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());assert(r.ok) });
  suite('T46'); await test('T46: overview ok true', async () => { const r=await vSvc.getStrategicOverviewViewModel(COMPANY_ID,vSvc.createViewModelCache());assert(r.ok) });
  suite('T47'); await test('T47: decision ok true', async () => { const r=await vSvc.getDecisionVisualizationViewModel(COMPANY_ID,vSvc.createViewModelCache());assert(r.ok) });
  suite('T48'); await test('T48: interface ok true', async () => { const r=await vSvc.getInterfaceIntelligenceViewModel(COMPANY_ID,vSvc.createViewModelCache());assert(r.ok) });
  suite('T49'); await test('T49: bundle ok true', async () => { const r=await vSvc.getExecutiveViewModelBundle(COMPANY_ID,vSvc.createViewModelCache());assert(r.ok) });
  suite('T50'); await test('T50: bundle generated_at all', async () => { const r=await vSvc.getExecutiveViewModelBundle(COMPANY_ID,vSvc.createViewModelCache());assert(r.executive_summary_view_model.generated_at&&r.interface_intelligence_view_model.generated_at) });
  suite('T51'); await test('T51: empty contract graceful', async () => { const v=svc.aioiExecutiveSummaryViewModel.buildExecutiveSummaryViewModel({});assert(typeof v.contract==='object') });
  suite('T52'); await test('T52: cockpit readiness in contract', async () => { const r=await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.cockpit_readiness.cockpit_score,86,'') });
  suite('T53'); await test('T53: visualization readiness in contract', async () => { const r=await vSvc.getStrategicOverviewViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.visualization_readiness.visualization_level,'visualization_ready','') });
  suite('T54'); await test('T54: decision consistency in contract', async () => { const r=await vSvc.getDecisionVisualizationViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.decision_consistency.consistency_status,'consistent','') });
  suite('T55'); await test('T55: interface coverage in contract', async () => { const r=await vSvc.getInterfaceIntelligenceViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.interface_coverage.coverage_status,'comprehensive','') });
  suite('T56'); await test('T56: composição P5.2 summary', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryViewModel.js'),'utf8'));assert(code.includes('getUiContractBundle')&&!code.includes('getExecutiveQueryBundle')) });
  suite('T57'); await test('T57: composição P5.2 overview', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiStrategicOverviewViewModel.js'),'utf8'));assert(code.includes('getUiContractBundle')&&!code.includes('getStrategicOverviewQuery')) });
  suite('T58'); await test('T58: composição P5.2 decision', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiDecisionVisualizationViewModel.js'),'utf8'));assert(code.includes('getUiContractBundle')&&!code.includes('getDecisionVisualizationQuery')) });
  suite('T59'); await test('T59: composição P5.2 interface', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiInterfaceIntelligenceViewModel.js'),'utf8'));assert(code.includes('getUiContractBundle')&&!code.includes('getInterfaceIntelligenceQuery')) });
  suite('T60'); await test('T60: sem P5.1 direto', async () => { const files=['aioiExecutiveSummaryViewModel.js','aioiExecutiveViewModelService.js'];for(const f of files){const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,f),'utf8'));assert(!code.includes('executiveQueryService')&&!code.includes('getExecutiveQueryBundle'),f)} });
  suite('T61'); await test('T61: sem P5.0 direto', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8'));assert(!code.includes('cockpitApiService')&&!code.includes('getCockpitSummary')) });
  suite('T62'); await test('T62: sem P4.6 direto', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8'));assert(!code.includes('getInterfaceIntelligenceReadModel')) });
  suite('T63'); await test('T63: sem LLM/IA', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8'));assert(!code.includes('openai')&&!code.includes('generateText')) });
  suite('T64'); await test('T64: sem forecast', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8'));assert(!code.includes('getBacklogForecast')) });
  suite('T65'); await test('T65: sem execução', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8'));assert(!code.includes('executeDecision')) });
  suite('T66'); await test('T66: sem React/HTML/CSS/JSX', async () => { const files=['aioiExecutiveViewModelService.js','aioiExecutiveSummaryViewModel.js'];for(const f of files){const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,f),'utf8'));assert(!code.includes('React')&&!code.includes('HTML')&&!code.includes('CSS')&&!code.includes('JSX')&&!code.includes('TSX'),f)} });
  suite('T67'); await test('T67: sem APIs novas', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8'));assert(!code.includes('express.Router')&&!code.includes('router.get')) });
  suite('T68'); await test('T68: sem Chart/widget/graph', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8'));assert(!code.includes('Chart.js')&&!code.includes('renderChart')&&!code.includes('Graph')) });
  suite('T69'); await test('T69: fan-out bundle shared cache', async () => { uiContractBundleCallCount=0;const cache=vSvc.createViewModelCache();await vSvc.getExecutiveViewModelBundle(COMPANY_ID,cache);assertEqual(uiContractBundleCallCount,1,'') });
  suite('T70'); await test('T70: fan-out summary+overview cache', async () => { uiContractBundleCallCount=0;const cache=vSvc.createViewModelCache();await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,cache);await vSvc.getStrategicOverviewViewModel(COMPANY_ID,cache);assertEqual(uiContractBundleCallCount,1,'') });
  suite('T71'); await test('T71: fan-out all view models cache', async () => { uiContractBundleCallCount=0;const cache=vSvc.createViewModelCache();await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,cache);await vSvc.getStrategicOverviewViewModel(COMPANY_ID,cache);await vSvc.getDecisionVisualizationViewModel(COMPANY_ID,cache);await vSvc.getInterfaceIntelligenceViewModel(COMPANY_ID,cache);assertEqual(uiContractBundleCallCount,1,'') });
  suite('T72'); await test('T72: independent cache fan-out', async () => { uiContractBundleCallCount=0;await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(uiContractBundleCallCount,2,'') });
  suite('T73'); await test('T73: getUiContractBundle uma vez summary', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryViewModel.js'),'utf8'));assertEqual((code.match(/getUiContractBundle/g)||[]).length,1,'') });
  suite('T74'); await test('T74: build* local service', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8'));assert(code.includes('buildExecutiveSummaryViewModel')&&code.includes('getExecutiveViewModelBundle')) });
  suite('T75'); await test('T75: 6 arquivos P5.3 existem', async () => { const files=['aioiExecutiveViewModelMetrics.js','aioiExecutiveViewModelService.js','aioiExecutiveSummaryViewModel.js','aioiStrategicOverviewViewModel.js','aioiDecisionVisualizationViewModel.js','aioiInterfaceIntelligenceViewModel.js'];for(const f of files)assert(fs.existsSync(path.join(SERVICES_PATH,f)),f) });
  suite('T76'); await test('T76: sem getExecutiveSummaryUiContract direto service', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8'));assert(!code.includes('getExecutiveSummaryUiContract')) });
  suite('T77'); await test('T77: sem buildExecutiveSummaryUiContract', async () => { const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryViewModel.js'),'utf8'));assert(!code.includes('buildExecutiveSummaryUiContract')) });
  suite('T78'); await test('T78: uiContractService import', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8').includes('aioiUiContractService')) });
  suite('T79'); await test('T79: soberanos ausentes', async () => { const forbidden=['operationalDecisionEngine','workflowOrchestrator','actionRuntimeOrchestrator'];const code=stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8'));for(const bad of forbidden)assert(!code.includes(bad)) });
  suite('T80'); await test('T80: sem scoring novo', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelMetrics.js'),'utf8')).includes('computePriorityScore')) });
  suite('T81'); await test('T81: RLS company_id', async () => { await vm.validateTenantRls(COMPANY_ID);const t=mock._client._calls.find(c=>c.sql.includes('app.current_company_id'));assert(t&&t.params[0]===COMPANY_ID) });
  suite('T82'); await test('T82: RLS bypass false', async () => { await vm.validateTenantRls(COMPANY_ID);assert(mock._client._calls.filter(c=>c.sql.includes('app.bypass_rls')).length>=1) });
  suite('T83'); await test('T83: zero writes RLS', async () => { assertNoWrites(mock._client._calls) });
  suite('T84'); await test('T84: tenant B RLS', async () => { await vm.validateTenantRls(COMPANY_ID_B);assert(mock._client._calls.find(c=>c.params&&c.params[0]===COMPANY_ID_B),'tenant B') });
  suite('T85'); await test('T85: tenant B summary view model', async () => { const r=await vSvc.getExecutiveSummaryViewModel(COMPANY_ID_B,vSvc.createViewModelCache());assert(r.ok) });
  suite('T86'); await test('T86: recordError', async () => { vm.recordError(COMPANY_ID,'test','err');assert(vm.getSessionCounters().view_model_error_count>=1) });
  suite('T87'); await test('T87: summary metric increment', async () => { vm.resetSessionCounters();await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());assert(vm.getSessionCounters().executive_summary_view_models>=1) });
  suite('T88'); await test('T88: overview metric increment', async () => { vm.resetSessionCounters();await vSvc.getStrategicOverviewViewModel(COMPANY_ID,vSvc.createViewModelCache());assert(vm.getSessionCounters().strategic_overview_view_models>=1) });
  suite('T89'); await test('T89: decision metric increment', async () => { vm.resetSessionCounters();await vSvc.getDecisionVisualizationViewModel(COMPANY_ID,vSvc.createViewModelCache());assert(vm.getSessionCounters().decision_visualization_view_models>=1) });
  suite('T90'); await test('T90: interface metric increment', async () => { vm.resetSessionCounters();await vSvc.getInterfaceIntelligenceViewModel(COMPANY_ID,vSvc.createViewModelCache());assert(vm.getSessionCounters().interface_intelligence_view_models>=1) });
  suite('T91'); await test('T91: view_model_requests counter', async () => { vm.resetSessionCounters();await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());assert(vm.getSessionCounters().view_model_requests>=1) });
  suite('T92'); await test('T92: log REQUESTED', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelMetrics.js'),'utf8').includes('AIOI_VIEW_MODEL_REQUESTED')) });
  suite('T93'); await test('T93: log COMPLETED', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelMetrics.js'),'utf8').includes('AIOI_VIEW_MODEL_COMPLETED')) });
  suite('T94'); await test('T94: log ERROR', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelMetrics.js'),'utf8').includes('AIOI_VIEW_MODEL_ERROR')) });
  suite('T95'); await test('T95: métrica view_model_requests', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelMetrics.js'),'utf8').includes('view_model_requests')) });
  suite('T96'); await test('T96: métrica executive_summary_view_models', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelMetrics.js'),'utf8').includes('executive_summary_view_models')) });
  suite('T97'); await test('T97: métrica strategic_overview_view_models', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelMetrics.js'),'utf8').includes('strategic_overview_view_models')) });
  suite('T98'); await test('T98: métrica decision_visualization_view_models', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelMetrics.js'),'utf8').includes('decision_visualization_view_models')) });
  suite('T99'); await test('T99: métrica interface_intelligence_view_models', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelMetrics.js'),'utf8').includes('interface_intelligence_view_models')) });
  suite('T100'); await test('T100: métrica avg_query_latency_ms', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelMetrics.js'),'utf8').includes('avg_query_latency_ms')) });
  suite('T101'); await test('T101: validateTenantRls export', async () => { assert(typeof vm.validateTenantRls==='function') });
  suite('T102'); await test('T102: LAYER constant', async () => { assertEqual(vm.LAYER,'AIOI_EXECUTIVE_VIEW_MODEL_METRICS','') });
  suite('T103'); await test('T103: validateTenantRls summary VM', async () => { assert(stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryViewModel.js'),'utf8')).includes('validateTenantRls')) });
  suite('T104'); await test('T104: resetSessionCounters', async () => { vm.resetSessionCounters();assertEqual(vm.getSessionCounters().view_model_requests,0,'') });
  suite('T105'); await test('T105: withTenantReadClient export', async () => { assert(typeof vm.withTenantReadClient==='function') });
  suite('T106'); await test('T106: regressão P5.2 ui contract service', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8').includes('getUiContractBundle')) });
  suite('T107'); await test('T107: regressão P5.2 ui contract metrics', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractMetrics.js'),'utf8').includes('AIOI_UI_CONTRACT_REQUESTED')) });
  suite('T108'); await test('T108: regressão P5.2 summary ui contract', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryUiContract.js'),'utf8').includes('getExecutiveSummaryUiContract')) });
  suite('T109'); await test('T109: regressão P5.2 report exists', async () => { assert(fs.existsSync(path.resolve(__dirname,'../../../docs/AIOI_P5_2_ENTERPRISE_EXECUTIVE_UI_CONTRACT_LAYER_REPORT.md'))) });
  suite('T110'); await test('T110: regressão P5.2 createContractCache', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8').includes('createContractCache')) });
  suite('T111'); await test('T111: view model view executive_summary', async () => { const r=await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.view,'executive_summary','') });
  suite('T112'); await test('T112: view model view strategic_overview', async () => { const r=await vSvc.getStrategicOverviewViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.view,'strategic_overview','') });
  suite('T113'); await test('T113: view model view decision_visualization', async () => { const r=await vSvc.getDecisionVisualizationViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.view,'decision_visualization','') });
  suite('T114'); await test('T114: view model view interface_intelligence', async () => { const r=await vSvc.getInterfaceIntelligenceViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.view,'interface_intelligence','') });
  suite('T115'); await test('T115: bundle view model keys', async () => { const r=await vSvc.getExecutiveViewModelBundle(COMPANY_ID,vSvc.createViewModelCache());assert('executive_summary_view_model' in r&&'interface_intelligence_view_model' in r) });
  suite('T116'); await test('T116: contract wrapper summary', async () => { const r=await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());assert('contract' in r&&typeof r.contract==='object') });
  suite('T117'); await test('T117: contract wrapper overview', async () => { const r=await vSvc.getStrategicOverviewViewModel(COMPANY_ID,vSvc.createViewModelCache());assert('contract' in r) });
  suite('T118'); await test('T118: contract wrapper decision', async () => { const r=await vSvc.getDecisionVisualizationViewModel(COMPANY_ID,vSvc.createViewModelCache());assert('contract' in r&&'data' in r.contract) });
  suite('T119'); await test('T119: contract wrapper interface', async () => { const r=await vSvc.getInterfaceIntelligenceViewModel(COMPANY_ID,vSvc.createViewModelCache());assert('contract' in r&&'data' in r.contract) });
  suite('T120'); await test('T120: determinístico build summary VM', async () => { const v1=svc.aioiExecutiveSummaryViewModel.buildExecutiveSummaryViewModel(SAMPLE_UI_BUNDLE.executive_summary_contract);const v2=svc.aioiExecutiveSummaryViewModel.buildExecutiveSummaryViewModel(SAMPLE_UI_BUNDLE.executive_summary_contract);assertEqual(v1.contract.data.executive_summary.summary_score,v2.contract.data.executive_summary.summary_score,'') });
  suite('T121'); await test('T121: determinístico build overview VM', async () => { const v1=svc.aioiStrategicOverviewViewModel.buildStrategicOverviewViewModel(SAMPLE_UI_BUNDLE.strategic_overview_contract);const v2=svc.aioiStrategicOverviewViewModel.buildStrategicOverviewViewModel(SAMPLE_UI_BUNDLE.strategic_overview_contract);assertEqual(v1.title,v2.title,'') });
  suite('T122'); await test('T122: sem Vue/Angular', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8')).includes('Vue')) });
  suite('T123'); await test('T123: sem automation runtime', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8')).includes('actionRuntime')) });
  suite('T124'); await test('T124: P5.3 ADDITIVE ONLY', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8')).includes('INSERT INTO')) });
  suite('T125'); await test('T125: exports getExecutiveViewModelBundle', async () => { assert(typeof vSvc.getExecutiveViewModelBundle==='function') });
  suite('T126'); await test('T126: exports buildDecisionVisualizationViewModel', async () => { assert(typeof vSvc.buildDecisionVisualizationViewModel==='function') });
  suite('T127'); await test('T127: bundle summary nested', async () => { const r=await vSvc.getExecutiveViewModelBundle(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.executive_summary_view_model.contract.data.executive_summary.summary_score,85,'') });
  suite('T128'); await test('T128: bundle overview nested', async () => { const r=await vSvc.getExecutiveViewModelBundle(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.strategic_overview_view_model.contract.data.strategic_overview.overview_score,84,'') });
  suite('T129'); await test('T129: bundle decision nested', async () => { const r=await vSvc.getExecutiveViewModelBundle(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.decision_visualization_view_model.contract.data.decision_perspective.perspective_score,85,'') });
  suite('T130'); await test('T130: bundle interface nested', async () => { const r=await vSvc.getExecutiveViewModelBundle(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.interface_intelligence_view_model.contract.data.enterprise_interface_intelligence.interface_score,87,'') });
  suite('T131'); await test('T131: companyId inválido decision', async () => { const r=await vSvc.getDecisionVisualizationViewModel('x');assert(!r.ok) });
  suite('T132'); await test('T132: companyId inválido interface', async () => { const r=await vSvc.getInterfaceIntelligenceViewModel(null);assert(!r.ok) });
  suite('T133'); await test('T133: companyId inválido overview', async () => { const r=await vSvc.getStrategicOverviewViewModel('');assert(!r.ok) });
  suite('T134'); await test('T134: loadUiContractBundle export', async () => { assert(typeof vSvc.loadUiContractBundle==='function') });
  suite('T135'); await test('T135: regressão P5.2 bundle structure', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8').includes('executive_summary_contract')) });
  suite('T136'); await test('T136: sem getAutonomyReadModel', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8')).includes('getAutonomyReadModel')) });
  suite('T137'); await test('T137: sem getVisualizationReadModel', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8')).includes('getVisualizationReadModel')) });
  suite('T138'); await test('T138: sem getConsumptionReadModel', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8')).includes('getConsumptionReadModel')) });
  suite('T139'); await test('T139: view model desacoplamento', async () => { const r=await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());assert(r.view&&r.contract&&!r.executive_summary_contract) });
  suite('T140'); await test('T140: bundle desacoplamento', async () => { const r=await vSvc.getExecutiveViewModelBundle(COMPANY_ID,vSvc.createViewModelCache());assert(r.executive_summary_view_model&&!r.executive_summary_contract) });
  suite('T141'); await test('T141: cockpit readiness level', async () => { const r=await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.cockpit_readiness.cockpit_level,'executive_ready','') });
  suite('T142'); await test('T142: enterprise decision viz level', async () => { const r=await vSvc.getDecisionVisualizationViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.enterprise_decision_visualization.visualization_level,'executive_visualization_ready','') });
  suite('T143'); await test('T143: interface consistency status', async () => { const r=await vSvc.getInterfaceIntelligenceViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.interface_consistency.consistency_status,'consistent','') });
  suite('T144'); await test('T144: readQuery export', async () => { assert(typeof vm.readQuery==='function') });
  suite('T145'); await test('T145: recordViewModelCompleted bundle', async () => { vm.resetSessionCounters();vm.recordViewModelCompleted(COMPANY_ID,'bundle',22);assert(vm.getSessionCounters().avg_query_latency_ms===22) });
  suite('T146'); await test('T146: regressão P5.2 READ ONLY', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiUiContractService.js'),'utf8')).includes('INSERT INTO')) });
  suite('T147'); await test('T147: regressão P5.1 intacto', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveQueryService.js'),'utf8').includes('getExecutiveQueryBundle')) });
  suite('T148'); await test('T148: report doc P5.3', async () => { assert(fs.existsSync(path.resolve(__dirname,'../../../docs/AIOI_P5_3_ENTERPRISE_EXECUTIVE_VIEW_MODEL_LAYER_REPORT.md'))) });
  suite('T149'); await test('T149: sem UI components', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8')).includes('createDashboard')) });
  suite('T150'); await test('T150: sem reimplementar P5.2 build', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryViewModel.js'),'utf8')).includes('buildExecutiveSummaryUiContract')) });
  suite('T151'); await test('T151: getUiContractBundle service once', async () => { assertEqual((stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8')).match(/getUiContractBundle/g)||[]).length,1,'') });
  suite('T152'); await test('T152: exports getExecutiveSummaryViewModel', async () => { assert(typeof vSvc.getExecutiveSummaryViewModel==='function') });
  suite('T153'); await test('T153: exports getInterfaceIntelligenceViewModel', async () => { assert(typeof vSvc.getInterfaceIntelligenceViewModel==='function') });
  suite('T154'); await test('T154: exports getDecisionVisualizationViewModel', async () => { assert(typeof vSvc.getDecisionVisualizationViewModel==='function') });
  suite('T155'); await test('T155: exports getStrategicOverviewViewModel', async () => { assert(typeof vSvc.getStrategicOverviewViewModel==='function') });
  suite('T156'); await test('T156: exports buildInterfaceIntelligenceViewModel', async () => { assert(typeof vSvc.buildInterfaceIntelligenceViewModel==='function') });
  suite('T157'); await test('T157: determinístico build decision VM', async () => { const v1=svc.aioiDecisionVisualizationViewModel.buildDecisionVisualizationViewModel(SAMPLE_UI_BUNDLE.decision_visualization_contract);const v2=svc.aioiDecisionVisualizationViewModel.buildDecisionVisualizationViewModel(SAMPLE_UI_BUNDLE.decision_visualization_contract);assertEqual(v1.contract.data.decision_perspective.perspective_score,v2.contract.data.decision_perspective.perspective_score,'') });
  suite('T158'); await test('T158: determinístico build interface VM', async () => { const v1=svc.aioiInterfaceIntelligenceViewModel.buildInterfaceIntelligenceViewModel(SAMPLE_UI_BUNDLE.interface_intelligence_contract);const v2=svc.aioiInterfaceIntelligenceViewModel.buildInterfaceIntelligenceViewModel(SAMPLE_UI_BUNDLE.interface_intelligence_contract);assertEqual(v1.contract.data.interface_perspective.perspective_score,v2.contract.data.interface_perspective.perspective_score,'') });
  suite('T159'); await test('T159: regressão P5.2 test file', async () => { assert(fs.existsSync(path.resolve(__dirname,'aioiUiContractLayer.test.js'))) });
  suite('T160'); await test('T160: regressão P5.2 strategic ui contract', async () => { assert(fs.existsSync(path.join(SERVICES_PATH,'aioiStrategicOverviewUiContract.js'))) });
  suite('T161'); await test('T161: regressão P5.2 interface ui contract', async () => { assert(fs.existsSync(path.join(SERVICES_PATH,'aioiInterfaceIntelligenceUiContract.js'))) });
  suite('T162'); await test('T162: bundle metric counts', async () => { vm.resetSessionCounters();await vSvc.getExecutiveViewModelBundle(COMPANY_ID,vSvc.createViewModelCache());assert(vm.getSessionCounters().executive_summary_view_models>=1&&vm.getSessionCounters().interface_intelligence_view_models>=1) });
  suite('T163'); await test('T163: summary status in contract data', async () => { const r=await vSvc.getExecutiveSummaryViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.executive_summary.summary_status,'summary_ready','') });
  suite('T164'); await test('T164: overview status in contract data', async () => { const r=await vSvc.getStrategicOverviewViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.strategic_overview.overview_status,'overview_ready','') });
  suite('T165'); await test('T165: decision perspective status', async () => { const r=await vSvc.getDecisionVisualizationViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.decision_perspective.perspective_status,'decision_ready','') });
  suite('T166'); await test('T166: interface perspective status', async () => { const r=await vSvc.getInterfaceIntelligenceViewModel(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.contract.data.interface_perspective.perspective_status,'interface_ready','') });
  suite('T167'); await test('T167: sem getCockpitReadModel', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8')).includes('getCockpitReadModel')) });
  suite('T168'); await test('T168: sem HTML em metrics', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelMetrics.js'),'utf8')).includes('<div')) });
  suite('T169'); await test('T169: createViewModelCache contractCache', async () => { const c=vSvc.createViewModelCache();assert(c.contractCache&&c.uiContractBundle===null) });
  suite('T170'); await test('T170: view-model-ready estrutura', async () => { const r=await vSvc.getExecutiveViewModelBundle(COMPANY_ID,vSvc.createViewModelCache());assert(r.executive_summary_view_model.title&&r.executive_summary_view_model.contract) });
  suite('T171'); await test('T171: sem página/componente', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8')).includes('createPage')) });
  suite('T172'); await test('T172: bundle decision title', async () => { const r=await vSvc.getExecutiveViewModelBundle(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.decision_visualization_view_model.title,'Decision Visualization','') });
  suite('T173'); await test('T173: bundle interface title', async () => { const r=await vSvc.getExecutiveViewModelBundle(COMPANY_ID,vSvc.createViewModelCache());assertEqual(r.interface_intelligence_view_model.title,'Interface Intelligence','') });
  suite('T174'); await test('T174: sem getExecutiveSummaryQuery', async () => { assert(!stripComments(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveSummaryViewModel.js'),'utf8')).includes('getExecutiveSummaryQuery')) });
  suite('T175'); await test('T175: createContractCache via P5.2', async () => { assert(fs.readFileSync(path.join(SERVICES_PATH,'aioiExecutiveViewModelService.js'),'utf8').includes('createContractCache')) });
  suite('T176'); await test('T176: P5.3 veredito estrutural', async () => { const files=['aioiExecutiveViewModelMetrics.js','aioiExecutiveViewModelService.js','aioiExecutiveSummaryViewModel.js','aioiStrategicOverviewViewModel.js','aioiDecisionVisualizationViewModel.js','aioiInterfaceIntelligenceViewModel.js'];for(const f of files)assert(fs.existsSync(path.join(SERVICES_PATH,f)),f) });

  restoreDb();
  console.log(`\n========================================`);
  console.log(`AIOI-P5.3 Enterprise Executive View Model Layer`);
  console.log(`PASS: ${_passed}  FAIL: ${_failed}  TOTAL: ${_passed + _failed}`);
  if (_failed === 0 && _passed >= 176) {
    console.log(`VERDICT: AIOI_P5_3_ENTERPRISE_EXECUTIVE_VIEW_MODEL_LAYER_PASS`);
  } else {
    console.log(`VERDICT: AIOI_P5_3_ENTERPRISE_EXECUTIVE_VIEW_MODEL_LAYER_FAIL`);
    process.exitCode = 1;
  }
}

runTests().catch(err => { console.error(err); process.exitCode = 1; });
