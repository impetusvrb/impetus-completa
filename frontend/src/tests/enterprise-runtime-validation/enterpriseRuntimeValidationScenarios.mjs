/**
 * Enterprise Runtime Validation — Fase 9 stability (menu, publication, IA/Chat, pipeline).
 */
import {
  isSidebarMenuItemActive,
  sidebarNavItemKey,
  dedupeSidebarMenuItems
} from '../../utils/sidebarNavHelpers.js';
import { safeMergeQualityPublicationIntoMenu } from '../../domains/quality/navigation/qualityMenuPublicationEngine.js';
import { safeMergeSafetyPublicationIntoMenu } from '../../domains/safety/navigation/safetyMenuPublicationEngine.js';
import { safeMergeLogisticsPublicationIntoMenu } from '../../domains/logistics/navigation/logisticsMenuPublicationEngine.js';
import { listManifestRoutesForTests as safetyRoutes } from '../../domains/safety/navigation/safetyNavigationManifest.js';
import { listLogisticsManifestRoutesForTests } from '../../domains/logistics/navigation/logisticsNavigationManifest.js';
import { validateEnterpriseContextualUx, classifyUxPressure } from '../../runtime-validation/enterpriseContextualUxValidator.js';
import { analyzeEnterpriseCognitiveMaturity } from '../../runtime-validation/enterpriseCognitiveMaturityEngine.js';
import { runEnterprisePublicationPipelineStability } from '../../runtime-validation/enterprisePublicationPipelineStability.js';

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

console.log('\nenterprise-runtime-validation (frontend)\n');

const BASE = [
  { path: '/app', label: 'Dashboard' },
  { path: '/app/chatbot', label: 'IA', aiIcon: true },
  { path: '/chat', label: 'Chat', chatIcon: true }
];

const ctx = { modulesLoading: false, user: { role: 'coordenador' }, visibleModules: [] };

ok('quality safeMerge preserves base', safeMergeQualityPublicationIntoMenu(BASE, null).length === BASE.length);
ok('safety safeMerge preserves base', safeMergeSafetyPublicationIntoMenu(BASE, null).length === BASE.length);
ok('logistics safeMerge preserves base', safeMergeLogisticsPublicationIntoMenu(BASE, null).length === BASE.length);

const pipeline = runEnterprisePublicationPipelineStability(ctx);
ok('pipeline stable', pipeline.stable === true);
ok('IA/Chat core preserved', pipeline.core_preserved === true);
ok('no recursive publication', pipeline.recursive_publication_risk === false);

let chained = BASE;
chained = safeMergeQualityPublicationIntoMenu(chained, ctx);
chained = safeMergeSafetyPublicationIntoMenu(chained, ctx);
chained = safeMergeLogisticsPublicationIntoMenu(chained, ctx);
ok('chained merge never shrinks', chained.length >= BASE.length);
ok('dashboard path kept', chained.some((i) => String(i.path || '').startsWith('/app') && !String(i.path).includes('quality')));

ok('sidebar deterministic', (() => {
  const a = isSidebarMenuItemActive('/app', '/app', '');
  const b = isSidebarMenuItemActive('/app', '/app', '');
  return a === b;
})());
ok('dedupe stable', dedupeSidebarMenuItems([{ path: '/app' }, { path: '/app' }]).length === 1);
ok('nav keys distinct domains', (() => {
  const q = sidebarNavItemKey({ _quality_manifest_id: 'q1', path: '/app/q' }, 0);
  const s = sidebarNavItemKey({ _safety_manifest_id: 's1', path: '/app/s' }, 1);
  const l = sidebarNavItemKey({ _logistics_manifest_id: 'l1', path: '/app/l' }, 2);
  return q !== s && s !== l;
})());

const ux = validateEnterpriseContextualUx({ band: 'director', menu_item_count: 6, abandonment_rate: 0.05 });
ok('ux pressure class', ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(ux.ux_pressure_class));
ok('classifyUxPressure LOW', classifyUxPressure(0, 0) === 'LOW');

const cog = analyzeEnterpriseCognitiveMaturity({ menu_extra_count: 3, view_count: 2 });
ok('cognitive maturity bounded', cog.rollout_readiness_score >= 0 && cog.rollout_readiness_score <= 100);

ok('safety manifest routes', safetyRoutes().length >= 5);
ok('logistics manifest routes', listLogisticsManifestRoutesForTests().length >= 6);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
