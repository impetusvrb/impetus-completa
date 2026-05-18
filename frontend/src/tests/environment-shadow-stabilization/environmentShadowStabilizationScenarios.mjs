import { runEnvironmentPublicationPipelineCheck } from '../../domains/environment/publication-runtime/environmentPublicationPipelineCheck.js';

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

console.log('\nenvironment-shadow-stabilization (frontend)\n');
const p = runEnvironmentPublicationPipelineCheck({ user: { role: 'coordenador' }, visibleModules: [] });
ok('pipeline ok', p.ok === true);
ok('core preserved', p.core_preserved === true);
ok('no recursive risk', p.recursive_publication_risk === false);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
