/**
 * AIOI-ORG-5 — Queue API Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const SRC = path.join(BACKEND_ROOT, 'src');

function readDoc(n) { const p = path.join(DOCS, n); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function readSrc(r) { const p = path.join(SRC, r); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function stripComments(c) { return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n'); }

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-ORG-5 — Queue API Audit\n');

  await test('QA1: AIOI_QUEUE_API_SPECIFICATION.md existe', () => {
    assert(readDoc('AIOI_QUEUE_API_SPECIFICATION.md'));
  });

  await test('QA2: GET /api/aioi/queue route existe', () => {
    const routes = readSrc('routes/aioi/aioiQueueRoutes.js');
    assert(routes.includes("router.get('/queue'"));
  });

  await test('QA3: server.js monta /api/aioi', () => {
    const srv = readSrc('server.js');
    assert(srv.includes("useRoute('/api/aioi'"));
  });

  await test('QA4: Queue API service existe', () => {
    assert(readSrc('services/aioi/aioiQueueApiService.js'));
  });

  await test('QA5: Autoridade aioi_executive_queue_snapshot', () => {
    const svc = readSrc('services/aioi/aioiQueueApiService.js');
    assert(svc.includes('aioi_executive_queue_snapshot'));
    assert(svc.includes('fetchLatestSnapshot'));
  });

  await test('QA6: Sem F47 rebuild na Queue API', () => {
    const files = [
      'services/aioi/aioiQueueApiService.js',
      'services/aioi/aioiExecutiveQueueReadModelService.js',
      'services/aioi/aioiExecutiveQueueSnapshotProjectionService.js'
    ];
    for (const f of files) {
      const c = stripComments(readSrc(f));
      assert(!c.includes('buildOperationalPriorityPack'), `${f} usa F47 pack`);
      assert(!c.includes('buildOperationalPriorityQueue'), `${f} usa F47 queue`);
      assert(!c.includes('buildLiveFeedPriorities'), `${f} usa F47 live feed`);
    }
  });

  await test('QA7: Sem computePriorityScore na Queue API', () => {
    const c = stripComments(readSrc('services/aioi/aioiQueueApiService.js'));
    assert(!c.includes('computePriorityScore'));
  });

  await test('QA8: Estado vazio SNAPSHOT_NOT_MATERIALIZED', () => {
    const contract = readSrc('services/aioi/aioiExecutiveQueueDashboardContract.js');
    assert(contract.includes('SNAPSHOT_NOT_MATERIALIZED'));
  });

  await test('QA9: Read model service existe', () => {
    assert(readSrc('services/aioi/aioiExecutiveQueueReadModelService.js'));
  });

  await test('QA10: View model service existe', () => {
    assert(readSrc('services/aioi/aioiExecutiveQueueViewModelService.js'));
  });

  await test('QA11: Snapshot projection service existe', () => {
    assert(readSrc('services/aioi/aioiExecutiveQueueSnapshotProjectionService.js'));
  });

  await test('QA12: Controller READ ONLY', () => {
    const c = stripComments(readSrc('controllers/aioi/aioiQueueController.js'));
    assert(!c.includes('INSERT INTO'));
  });

  await test('QA13: ORG-1 Q-01 referenciado na spec', () => {
    const d = readDoc('AIOI_QUEUE_API_SPECIFICATION.md');
    assert(d.includes('Q-01') || d.includes('Single Source'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
