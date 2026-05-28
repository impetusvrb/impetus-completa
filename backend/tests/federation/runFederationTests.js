'use strict';

process.env.IMPETUS_FEDERATION_ENABLED = 'true';
process.env.IMPETUS_FEDERATION_MODE = 'audit';
process.env.IMPETUS_FEDERATION_PILOT_TENANTS = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';

let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log('  ✓', name);
  } else {
    failed += 1;
    console.error('  ✗', name, detail);
  }
}

async function main() {
  const flags = require('../../src/federation/config/federationFlags');
  const gov = require('../../src/federation/governance/federationGovernanceService');

  console.log('\n── Federation flags ──');
  assert('enabled', flags.isFederationEnabled());
  assert('mode audit', flags.federationMode() === 'audit');
  assert('pilot tenant active', gov.isActiveForTenant('21dd3cee-2efa-4936-908f-9ff1ba04e2a3'));
  assert('non-pilot inactive', !gov.isActiveForTenant('00000000-0000-4000-8000-000000000099'));
  assert('cannot issue session in audit', !gov.canIssueSession('audit'));
  assert('can issue in on', gov.canIssueSession('on'));
  assert('invariants password preserved', flags.invariants.password_login_preserved);

  console.log('\n── Schema bootstrap ──');
  const bootstrap = require('../../src/federation/bootstrap/federationSchemaBootstrap');
  const schema = await bootstrap.ensureFederationSchema();
  assert('schema ok', schema.ok === true, schema.error || '');

  console.log('\n── SCIM token hash ──');
  const scim = require('../../src/federation/services/scimProvisioningService');
  const bad = await scim.validateScimBearer('Bearer invalid');
  assert('invalid scim rejected', bad.ok === false);

  console.log(`\nFederation tests: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
