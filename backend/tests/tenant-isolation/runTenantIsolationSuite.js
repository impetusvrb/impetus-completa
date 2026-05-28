'use strict';

process.env.IMPETUS_RLS_ENABLED = 'true';
process.env.IMPETUS_RLS_MODE = 'audit';
process.env.IMPETUS_RLS_PILOT_TENANTS = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';

let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) { passed += 1; console.log('  ✓', name); }
  else { failed += 1; console.error('  ✗', name, detail); }
}

async function main() {
  const flags = require('../../src/tenant-isolation/config/tenantRlsFlags');
  const gov = require('../../src/tenant-isolation/governance/tenantRlsGovernanceService');
  const rls = require('../../src/tenant-isolation/runtime/tenantRlsRuntime');

  console.log('\n── RLS flags ──');
  assert('enabled', flags.isRlsEnabled());
  assert('audit mode', flags.rlsMode() === 'audit');
  assert('pilot active', gov.isActiveForTenant('21dd3cee-2efa-4936-908f-9ff1ba04e2a3'));
  assert('no enforce in audit', !gov.shouldEnforceRls('audit'));
  assert('fuzz enabled', flags.fuzzEnabled());

  console.log('\n── Schema + registry ──');
  const boot = await rls.boot();
  assert('schema ok', boot.schema?.ok !== false);
  const registry = await rls.listRegistry();
  assert('registry >= 10 tables', registry.length >= 10, String(registry.length));

  console.log('\n── Fuzz suite ──');
  const fuzz = require('../../src/tenant-isolation/testing/tenantFuzzSuite');
  const fuzzOut = await fuzz.runFullSuite();
  assert('fuzz completes', fuzzOut.trace_id != null);
  assert('fuzz ok or skipped only', fuzzOut.ok === true, JSON.stringify(fuzzOut.summary));

  console.log('\n── Attack simulation ──');
  const attack = require('../../src/tenant-isolation/testing/crossTenantAttackSimulator');
  const atk = await attack.runAttackSimulation();
  assert('chaos completes', atk.trace_id != null);

  console.log(`\nTenant isolation suite: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
