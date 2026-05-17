/**
 * quality-publication-activation (frontend smoke)
 */
import { scorePublicationReadiness } from '../../domains/quality/activation/qualityPublicationReadinessScoring.js';
import { analyzeQualityUxDensity } from '../../domains/quality/activation/qualityUxDensityAnalyzer.js';
import { describeTenantActivation } from '../../domains/quality/activation/qualityTenantActivationMatrix.js';
import { audiencesForStage } from '../../domains/quality/activation/qualityRolloutAudienceMatrix.js';

let p = 0;
let f = 0;
function ok(label, cond) {
  if (cond) {
    p++;
    console.log('  OK', label);
  } else {
    f++;
    console.log('  FAIL', label);
  }
}

const score = scorePublicationReadiness({
  operational: false,
  navigation: false,
  publication: false,
  tenantId: null
});
ok('readiness penalizes', score.score < 100);

const ux = analyzeQualityUxDensity({ role: 'diretor', company_id: 'x' });
ok('ux density', typeof ux.density === 'string');

ok('tenant matrix', describeTenantActivation('pilot').menu_live === true);
ok('audience matrix', Array.isArray(audiencesForStage('full')));

console.log(`\nDone. ${p} ok, ${f} fail`);
process.exit(f ? 1 : 0);
