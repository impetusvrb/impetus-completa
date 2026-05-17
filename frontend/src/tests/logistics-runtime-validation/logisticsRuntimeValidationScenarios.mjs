/**
 * LOGISTICS — publication runtime smoke (enterprise alignment).
 */
import { safeMergeLogisticsPublicationIntoMenu } from '../../domains/logistics/navigation/logisticsMenuPublicationEngine.js';
import { resolveLogisticsAudienceBand } from '../../domains/logistics/navigation/logisticsAudienceNavigation.js';
import { listLogisticsManifestRoutesForTests } from '../../domains/logistics/navigation/logisticsNavigationManifest.js';
import { sidebarNavItemKey } from '../../utils/sidebarNavHelpers.js';
import { getLogisticsNavigationStabilitySnapshot } from '../../domains/logistics/navigation/logisticsNavigationStabilityRuntime.js';

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

console.log('\nlogistics-runtime-validation (frontend)\n');

const BASE = [{ path: '/app', label: 'Dashboard' }, { path: '/app/chatbot', label: 'IA', aiIcon: true }];

ok('safeMerge null preserves base', safeMergeLogisticsPublicationIntoMenu(BASE, null).length === BASE.length);
ok('safeMerge never shrinks', safeMergeLogisticsPublicationIntoMenu(BASE, { modulesLoading: false, user: { role: 'operador' }, visibleModules: [] }).length >= BASE.length);
ok('manifest routes', listLogisticsManifestRoutesForTests().length >= 8);
ok('audience operator', resolveLogisticsAudienceBand({ role: 'operador' }) === 'operator');
ok('sidebar key logistics', sidebarNavItemKey({ path: '/app/logistics/op', _logistics_manifest_id: 'logistics_operational' }, 0).includes('logistics_operational'));
ok('stability snapshot', typeof getLogisticsNavigationStabilitySnapshot().stable === 'boolean');

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
