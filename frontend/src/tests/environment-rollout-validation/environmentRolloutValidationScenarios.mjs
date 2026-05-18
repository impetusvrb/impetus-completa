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

console.log('\nenvironment-rollout-validation (frontend)\n');
const p = runEnvironmentPublicationPipelineCheck();
ok('never shrunk', p.never_shrunk === true);
ok('four domain order', p.pipeline_order.length === 4);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
