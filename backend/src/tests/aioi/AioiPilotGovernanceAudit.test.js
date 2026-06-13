/**
 * AIOI-P2.5 — Pilot Governance Audit (PC-PROD-05)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const SRC = path.join(BACKEND_ROOT, 'src');

function readDoc(n) { const p = path.join(DOCS, n); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }

const pilotFlags = require('../../services/aioi/aioiPilotFlags');

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P2.5 — Pilot Governance Audit\n');

  await test('PG-DOC: AIOI_PILOT_GOVERNANCE_CONTRACT.md', () => {
    const d = readDoc('AIOI_PILOT_GOVERNANCE_CONTRACT.md');
    assert(d && d.includes('PG-01'));
  });

  await test('PG-01: Máximo 3 tenants', () => {
    assert.strictEqual(pilotFlags.MAX_PILOT_TENANTS, 3);
    const d = readDoc('AIOI_PILOT_GOVERNANCE_CONTRACT.md');
    assert(d.includes('3 tenants') || d.includes('máx. 3'));
  });

  await test('PG-02: validatePilotConfig exportado', () => {
    assert(typeof pilotFlags.validatePilotConfig === 'function');
  });

  await test('PG-03: Flags controladas (defaults false)', () => {
    const flags = pilotFlags.getAioiFlags();
    const origEnabled = process.env.IMPETUS_AIOI_ENABLED;
    const origWorker = process.env.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED;
    delete process.env.IMPETUS_AIOI_ENABLED;
    delete process.env.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED;
    const fresh = require('../../services/aioi/aioiPilotFlags');
    assert.strictEqual(fresh.getAioiFlags().IMPETUS_AIOI_ENABLED, false);
    assert.strictEqual(fresh.getAioiFlags().IMPETUS_AIOI_OUTBOX_WORKER_ENABLED, false);
    if (origEnabled !== undefined) process.env.IMPETUS_AIOI_ENABLED = origEnabled;
    if (origWorker !== undefined) process.env.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED = origWorker;
  });

  await test('PG-04: Rollback documentado', () => {
    const d = readDoc('AIOI_PILOT_GOVERNANCE_CONTRACT.md');
    assert(d.includes('Rollback') || d.includes('rollback'));
  });

  await test('PG-05: isPilotTenant()', () => {
    assert(typeof pilotFlags.isPilotTenant === 'function');
  });

  await test('PG-06: UUID inválido rejeitado', () => {
    process.env.IMPETUS_AIOI_PILOT_TENANTS = 'not-a-uuid,also-invalid';
    delete require.cache[require.resolve('../../services/aioi/aioiPilotFlags')];
    const fresh = require('../../services/aioi/aioiPilotFlags');
    const tenants = fresh.getPilotTenants();
    assert.strictEqual(tenants.length, 0);
    delete process.env.IMPETUS_AIOI_PILOT_TENANTS;
  });

  await test('PG-07: Contrato documenta cross-tenant leakage', () => {
    const d = readDoc('AIOI_PILOT_GOVERNANCE_CONTRACT.md');
    assert(d.includes('cross-tenant') || d.includes('tenant isolation') || d.includes('RLS'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
