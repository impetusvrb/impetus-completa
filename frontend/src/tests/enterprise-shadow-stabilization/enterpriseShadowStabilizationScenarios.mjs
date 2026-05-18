import { runEnterprisePublicationPipelineStability } from '../../runtime-validation/enterprisePublicationPipelineStability.js';
import { recommendUxStabilization } from '../../enterprise-shadow-stabilization/contextualUxStabilization.js';

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

console.log('\nenterprise-shadow-stabilization (frontend)\n');

const pipe = runEnterprisePublicationPipelineStability({ user: { role: 'operador' }, visibleModules: [] });
ok('multi-domain pipeline stable', pipe.stable === true);
ok('IA chat preserved', pipe.core_preserved === true);

const ux = recommendUxStabilization('operator', 5, 2);
ok('ux assistive only', ux.assistive_only === true && ux.auto_apply === false);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
