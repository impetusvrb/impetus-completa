'use strict';

const preflight = require('../../domains/environment/activation/environmentShadowPreflightRuntime');

let passed = 0;
let failed = 0;

function ok(label, cond) {
  if (cond) {
    console.log(`  OK ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}`);
    failed++;
  }
}

console.log('\nenvironment-shadow-preflight\n');

const pack = preflight.runEnvironmentShadowPreflight();
ok('framework', pack.framework === 'environment_shadow_preflight');
ok('shadow_only', pack.shadow_only === true);
ok('auto_promotion false', pack.auto_promotion === false);
ok('checks array', Array.isArray(pack.checks) && pack.checks.length >= 6);
ok('audience bands', !!pack.audience?.bands?.operator);
ok('cognitive pack', typeof pack.cognitive?.ok === 'boolean');

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
