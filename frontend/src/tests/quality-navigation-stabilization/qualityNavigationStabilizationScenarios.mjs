/**
 * Stabilização de navegação QUALITY — smoke estático (Node VM modules).
 */
import assert from 'assert';
import {
  dedupeSidebarMenuItems,
  isSidebarMenuItemActive,
  sidebarNavItemKey
} from '../../utils/sidebarNavHelpers.js';
import { safeMergeQualityPublicationIntoMenu } from '../../domains/quality/navigation/qualityMenuPublicationEngine.js';

function ok(name, cond) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`  OK ${name}`);
}

console.log('\nquality-navigation-stabilization\n');

const legacyAndQuality = [
  { path: '/app/chatbot', label: 'IA', icon: null },
  { path: '/chat', label: 'Chat', icon: null },
  { path: '/app/quality/operational', label: 'Q op', icon: null, _quality_publication: true, _quality_manifest_id: 'quality_operational' },
  {
    path: '/app/quality/operational?view=governance',
    label: 'Governança',
    icon: null,
    _quality_publication: true,
    _quality_manifest_id: 'quality_spc_governance'
  }
];

ok('unique keys for same base path different manifest', (() => {
  const k0 = sidebarNavItemKey(legacyAndQuality[2], 0);
  const k1 = sidebarNavItemKey(legacyAndQuality[3], 1);
  return k0 !== k1;
})());

ok('dedupe keeps IA chat and distinct quality ids', (() => {
  const d = dedupeSidebarMenuItems(legacyAndQuality);
  return d.length === 4;
})());

ok('active governance query', isSidebarMenuItemActive(
  '/app/quality/operational?view=governance',
  '/app/quality/operational',
  '?view=governance'
));

ok('inactive base when view set', !isSidebarMenuItemActive(
  '/app/quality/operational',
  '/app/quality/operational',
  '?view=governance'
));

ok('active base when no view', isSidebarMenuItemActive(
  '/app/quality/operational',
  '/app/quality/operational',
  ''
));

const corruptedCtx = null;
const mergedSafe = safeMergeQualityPublicationIntoMenu(
  [{ path: '/app', label: 'Home', icon: null }],
  corruptedCtx
);
ok('safe merge preserves base on bad ctx', Array.isArray(mergedSafe) && mergedSafe.length >= 1);

console.log('\nDone.\n');
