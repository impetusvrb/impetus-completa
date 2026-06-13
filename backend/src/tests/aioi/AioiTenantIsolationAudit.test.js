/**
 * AIOI-P3.4 — Tenant Isolation Audit (TV-01..TV-06)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const MIGRATIONS = path.join(BACKEND_ROOT, 'migrations');
const SRC = path.join(BACKEND_ROOT, 'src');

function readSrc(r) { const p = path.join(SRC, r); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function stripComments(c) { return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n'); }

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P3.4 — Tenant Isolation Audit\n');

  await test('TV-01: RLS ativo em migrations', () => {
    const files = fs.readdirSync(MIGRATIONS).filter(f => f.includes('aioi'));
    let found = false;
    for (const f of files) {
      const c = fs.readFileSync(path.join(MIGRATIONS, f), 'utf8');
      if (c.includes('ROW LEVEL SECURITY') || c.includes('ENABLE ROW LEVEL SECURITY')) found = true;
    }
    assert(found);
  });

  await test('TV-02: company_id obrigatório nos serviços core', () => {
    for (const f of ['aioiOutboxConsumerService.js', 'aioiExecutionBridgeService.js', 'aioiLearningBridgeService.js']) {
      const c = readSrc(`services/aioi/${f}`);
      assert(c.includes('company_id'));
      assert(c.includes('companyId'));
    }
  });

  await test('TV-03: set_config RLS nos bridges', () => {
    for (const f of ['aioiOutboxConsumerService.js', 'aioiExecutionBridgeService.js', 'aioiLearningBridgeService.js']) {
      const c = readSrc(`services/aioi/${f}`);
      assert(c.includes('app.current_company_id'));
      assert(c.includes("app.bypass_rls', 'false'"));
    }
  });

  await test('TV-04: Worker processa apenas pilot tenants', () => {
    const c = readSrc('services/aioi/aioiOutboxWorkerService.js');
    assert(c.includes('getPilotTenants') || c.includes('pilotFlags'));
    assert(c.includes('validatePilotConfig'));
  });

  await test('TV-05: Snapshot isolado por tenant', () => {
    const c = readSrc('services/aioi/aioiExecutiveQueueSnapshotProjectionService.js');
    assert(c.includes('company_id'));
    const snap = readSrc('services/aioi/aioiExecutiveQueueSnapshotProjectionService.js');
    assert(snap.includes('fetchLatestSnapshot'));
  });

  await test('TV-06: Health endpoint não expõe dados sensíveis', () => {
    const c = stripComments(readSrc('controllers/aioi/aioiHealthController.js'));
    const h = stripComments(readSrc('services/aioi/aioiOperationalHealthService.js'));
    assert(!c.includes('decision_payload'));
    assert(!h.includes('decision_payload'));
    assert(!c.includes('password'));
  });

  await test('TV-07: Pilot flags MAX 3 tenants', () => {
    const pilotFlags = require('../../services/aioi/aioiPilotFlags');
    assert.strictEqual(pilotFlags.MAX_PILOT_TENANTS, 3);
  });

  await test('TV-08: SLA compliance scoped por tenant', () => {
    const sla = require('../../services/aioi/aioiSlaComplianceService');
    assert(typeof sla.getSlaComplianceForTenant === 'function');
    const c = readSrc('services/aioi/aioiSlaComplianceService.js');
    assert(c.includes('app.current_company_id'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
