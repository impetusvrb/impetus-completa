import { resolveEnvironmentAudienceBand, resolveEnvironmentUxDensity } from '../../domains/environment/navigation/environmentAudienceNavigation.js';

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

console.log('\nenvironment-audience-validation (frontend)\n');
ok('technician area', resolveEnvironmentAudienceBand({ functional_area: 'ETA' }) === 'technician');
ok('director density', resolveEnvironmentUxDensity('director') === 'executive');
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
