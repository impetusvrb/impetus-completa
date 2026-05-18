/**
 * ENVIRONMENT — publication runtime smoke (enterprise alignment).
 */
import { safeMergeEnvironmentPublicationIntoMenu } from '../../domains/environment/navigation/environmentMenuPublicationEngine.js';
import { resolveEnvironmentAudienceBand } from '../../domains/environment/navigation/environmentAudienceNavigation.js';
import { listEnvironmentManifestRoutesForTests } from '../../domains/environment/navigation/environmentNavigationManifest.js';
import { sidebarNavItemKey } from '../../utils/sidebarNavHelpers.js';
import { getEnvironmentNavigationStabilitySnapshot } from '../../domains/environment/navigation/environmentNavigationStabilityRuntime.js';

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

console.log('\nenvironment-runtime-validation (frontend)\n');

const BASE = [{ path: '/app', label: 'Dashboard' }, { path: '/app/chatbot', label: 'IA', aiIcon: true }];

ok('safeMerge null preserves base', safeMergeEnvironmentPublicationIntoMenu(BASE, null).length === BASE.length);
ok(
  'safeMerge never shrinks',
  safeMergeEnvironmentPublicationIntoMenu(BASE, { modulesLoading: false, user: { role: 'operador' }, visibleModules: [] })
    .length >= BASE.length
);
ok('manifest routes', listEnvironmentManifestRoutesForTests().length >= 8);
ok('audience operator', resolveEnvironmentAudienceBand({ role: 'operador' }) === 'operator');
ok(
  'sidebar key environment',
  sidebarNavItemKey({ path: '/app/environment/op', _environment_manifest_id: 'environment_operational' }, 0).includes(
    'environment_operational'
  )
);
ok('stability snapshot', typeof getEnvironmentNavigationStabilitySnapshot().stable === 'boolean');

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
