import { validateEnvironmentContextualUx } from '../../domains/environment/publication-runtime/environmentContextualUxValidation.js';
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

console.log('\nenvironment-publication-validation (frontend)\n');
ok('ux valid operator', validateEnvironmentContextualUx({ band: 'operator', visible_menu_count: 3 }).ok === true);
ok('pipeline includes environment', runEnvironmentPublicationPipelineCheck().pipeline_order.includes('environment'));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
