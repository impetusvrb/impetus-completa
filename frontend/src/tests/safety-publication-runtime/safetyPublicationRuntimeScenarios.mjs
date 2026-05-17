/**
 * SST — publication runtime smoke tests (enterprise-safe merge, audience, manifest).
 */
import {
  isSidebarMenuItemActive,
  sidebarNavItemKey,
  dedupeSidebarMenuItems
} from '../../utils/sidebarNavHelpers.js';
import {
  safeMergeSafetyPublicationIntoMenu,
  mergeSafetyPublicationIntoMenu
} from '../../domains/safety/navigation/safetyMenuPublicationEngine.js';
import { resolveSafetyAudienceBand } from '../../domains/safety/navigation/safetyAudienceNavigation.js';
import { listManifestRoutesForTests } from '../../domains/safety/navigation/safetyNavigationManifest.js';

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

console.log('\nsafety-publication-runtime\n');

const BASE = [
  { path: '/app', label: 'Dashboard' },
  { path: '/app/chatbot', label: 'IA', aiIcon: true },
  { path: '/chat', label: 'Chat', chatIcon: true }
];

ok('safeMerge null ctx preserves base', safeMergeSafetyPublicationIntoMenu(BASE, null).length === BASE.length);
ok('safeMerge never shrinks', safeMergeSafetyPublicationIntoMenu(BASE, { modulesLoading: false, user: { role: 'coordenador' }, visibleModules: [] }).length >= BASE.length);
ok('safety manifest routes non-empty', listManifestRoutesForTests().length >= 5);
ok('audience band sst_technician', resolveSafetyAudienceBand({ functional_area: 'SST' }) === 'sst_technician');
ok('sidebar key safety manifest', sidebarNavItemKey({ path: '/app/safety/op', _safety_manifest_id: 'safety_operational' }, 0).includes('safety_operational'));
ok('merge does not mutate base', (() => {
  const b = [{ path: '/app' }];
  mergeSafetyPublicationIntoMenu(b, { modulesLoading: true, visibleModules: [] });
  return b.length === 1;
})());

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
