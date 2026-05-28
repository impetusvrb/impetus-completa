'use strict';

process.env.IMPETUS_MFA_ENABLED = 'true';
process.env.IMPETUS_MFA_MODE = 'audit';

let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) { passed += 1; console.log('  ✓', name); }
  else { failed += 1; console.error('  ✗', name, detail); }
}

async function main() {
  const flags = require('../../src/mfa/config/mfaFlags');
  const gov = require('../../src/mfa/governance/mfaGovernanceService');
  const totp = require('../../src/mfa/services/totpMfaService');

  console.log('\n── MFA flags ──');
  assert('enabled', flags.isMfaEnabled());
  assert('audit mode', flags.mfaMode() === 'audit');
  assert('pilot active', gov.isActiveForTenant('21dd3cee-2efa-4936-908f-9ff1ba04e2a3'));
  assert('no enforce in audit', !gov.shouldEnforceChallenge('audit'));

  console.log('\n── TOTP crypto ──');
  const secret = totp.generateSecret();
  const token = require('otplib').authenticator.generate(secret);
  assert('totp verify', totp.verifyToken(secret, token));

  console.log('\n── Schema ──');
  const boot = require('../../src/mfa/bootstrap/mfaSchemaBootstrap');
  const schema = await boot.ensureMfaSchema();
  assert('schema ok', schema.ok, schema.error);

  console.log(`\nMFA tests: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
