import { resolveEnvironmentCapabilities } from '../../domains/environment/publication-runtime/environmentCapabilityResolver.js';

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

console.log('\nenvironment-publication-activation (frontend)\n');
const caps = resolveEnvironmentCapabilities({
  visibleModules: ['environment_intelligence'],
  rollout_shadow: true
});
ok('intelligence capability when licensed', caps.moduleLicensed === true);
ok('shadow blocks executive', caps.capabilities.environment_executive === false);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
