/**
 * AIOI-P4.1 — Tenant Capacity Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const SRC = path.join(BACKEND_ROOT, 'src');

function readDoc(n) { return fs.existsSync(path.join(DOCS, n)) ? fs.readFileSync(path.join(DOCS, n), 'utf8') : null; }
function readSrc(r) { return fs.existsSync(path.join(SRC, r)) ? fs.readFileSync(path.join(SRC, r), 'utf8') : null; }
function stripComments(c) { return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n'); }

const capacity = require('../../services/aioi/aioiTenantCapacityService');

const METRICS = [
  'tenant_throughput', 'tenant_queue_volume', 'tenant_sla_pressure',
  'tenant_processing_utilization', 'tenant_growth_metrics', 'tenant_operational_saturation'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P4.1 — Tenant Capacity Audit\n');

  await test('TC-DOC: spec existe', () => assert(readDoc('AIOI_MULTI_TENANT_CAPACITY_SPECIFICATION.md')));
  await test('TC-01: serviço existe', () => assert(readSrc('services/aioi/aioiTenantCapacityService.js')));
  await test('TC-02: getTenantCapacitySnapshot', () => assert(typeof capacity.getTenantCapacitySnapshot === 'function'));

  for (const m of METRICS) {
    await test(`TC-METRIC: ${m}`, () => assert(readSrc('services/aioi/aioiTenantCapacityService.js').includes(m)));
  }

  await test('TC-03: READ ONLY — sem UPDATE workflow', () => {
    const c = stripComments(readSrc('services/aioi/aioiTenantCapacityService.js'));
    assert(!c.includes('UPDATE industrial_operational_events SET status'));
    assert(!c.includes('classifyIoe'));
  });

  await test('TC-04: RLS por tenant', () => {
    assert(readSrc('services/aioi/aioiTenantCapacityService.js').includes('app.current_company_id'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
