/**
 * SST — validação operacional (analytics, UX, cognitive, manifest pilot).
 */
import { analyzeSafetyCognitivePressure } from '../../domains/safety/analytics/safetyCognitivePressureAnalyzer.js';
import { analyzeSafetyUxDensity, validateContextualUxClient } from '../../domains/safety/analytics/safetyContextualUxValidator.js';
import { listManifestRoutesForTests } from '../../domains/safety/navigation/safetyNavigationManifest.js';
import {
  getSafetyOperationalTelemetrySnapshot,
  noteSafetyCognitivePressure,
  noteSafetyRolloutReadiness
} from '../../observability/safetyOperationalTelemetry.js';

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

console.log('\nsafety-operational-validation\n');

const cog = analyzeSafetyCognitivePressure({ menu_extra_count: 4, view_count: 2 });
ok('cognitive risk bounded', cog.cognitive_risk_score >= 0 && cog.cognitive_risk_score <= 100);
ok('overload flag boolean', typeof cog.overload_detected === 'boolean');

const opUx = validateContextualUxClient({ band: 'operator', menu_item_count: 5, navigation_depth: 2, click_density: 6 });
ok('operator ux acceptable band', opUx.band === 'operator');
ok('operator compact density', analyzeSafetyUxDensity({ role: 'operador' }).density === 'compact');

const dirUx = validateContextualUxClient({ band: 'director', menu_item_count: 6, navigation_depth: 3, click_density: 10 });
ok('director strategic band', dirUx.band === 'director');

const routes = listManifestRoutesForTests();
ok('manifest includes pilot view', routes.some((p) => p.includes('view=pilot')));

noteSafetyCognitivePressure(42);
noteSafetyRolloutReadiness(58);
const tel = getSafetyOperationalTelemetrySnapshot();
ok('telemetry cognitive pressure', tel.safety_cognitive_pressure === 42);
ok('telemetry rollout readiness', tel.safety_rollout_readiness_score === 58);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
