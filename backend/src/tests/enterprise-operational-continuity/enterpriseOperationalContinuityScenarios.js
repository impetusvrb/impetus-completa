'use strict';

const continuity = require('../../enterprise-hardening/enterpriseContinuity');
const hardening = require('../../enterprise-hardening/enterpriseOperationalHardeningRuntime');

let passed = 0;
let failed = 0;
function ok(l, c) {
  if (c) {
    console.log(`  OK ${l}`);
    passed++;
  } else {
    console.error(`  FAIL ${l}`);
    failed++;
  }
}

console.log('\nenterprise-operational-continuity\n');
const pub = continuity.enterprisePublicationContinuityRuntime();
ok('publication continuity', typeof pub.ok === 'boolean');
const rollout = continuity.enterpriseRolloutContinuityRuntime();
ok('rollout no auto promotion', rollout.auto_promotion === false);
ok('rollout ok', rollout.ok === true);

const pack = hardening.enterpriseOperationalHardeningRuntime({ tenant_id: 't1' });
ok('industrial continuity', !!pack.continuity);
ok('publication fragment flag', typeof pack.continuity.publication?.ok === 'boolean');
ok('rollout continuity', pack.continuity.rollout?.auto_promotion === false);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
