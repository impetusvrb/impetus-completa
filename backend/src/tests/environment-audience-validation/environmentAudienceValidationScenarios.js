'use strict';

const {
  resolveEnvironmentAudienceBand,
  resolveAudienceManifestIds,
  environmentAudienceRuntime
} = require('../../domains/environment/publication');

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

console.log('\nenvironment-audience-validation\n');

ok('operator band', resolveEnvironmentAudienceBand({ role: 'operador' }) === 'operator');
ok('director band', resolveEnvironmentAudienceBand({ role: 'diretor' }) === 'director');
ok('technician from area', resolveEnvironmentAudienceBand({ role: 'x', functional_area: 'ambiental' }) === 'technician');

const opIds = resolveAudienceManifestIds('operator');
ok('operator sees effluent', opIds.includes('environment_effluent'));

const matrix = environmentAudienceRuntime([
  { resolved_band: 'operator', visible_menu_count: 4, module_licensed: true, should_publish_menu: true, publication_runtime_on: true },
  { resolved_band: 'director', visible_menu_count: 6, module_licensed: true, should_publish_menu: true, publication_runtime_on: true }
]);
ok('audience matrix ok', matrix.ok === true);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
