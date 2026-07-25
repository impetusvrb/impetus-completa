/**
 * Testes de volume isolados — fora do runtime de produção.
 * Executar: node admin-portal/scripts/test-legacy-utils.mjs
 */
import {
  LEGACY_LIMITS,
  canExploreList,
  exploreListLabel,
  previewMeta,
  sortCorrelationIncidents,
  sortCriticalEvents,
  takePreview,
} from '../src/utils/legacyDashboardUtils.js';

const volumes = [0, 1, 5, 10, 50, 500];
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  }
}

for (const n of volumes) {
  const items = Array.from({ length: n }, (_, i) => ({ id: i }));
  const { preview, total } = takePreview(items, LEGACY_LIMITS.BLOCKED_IPS);
  assert(total === n, `takePreview total=${n}`);
  assert(preview.length === Math.min(n, LEGACY_LIMITS.BLOCKED_IPS), `takePreview preview len for n=${n}`);
  assert(
    canExploreList(n, preview.length) === (n > preview.length),
    `canExploreList n=${n}`
  );
}

assert(exploreListLabel(0) === null, 'exploreListLabel(0)');
assert(exploreListLabel(25) === 'Ver registros disponíveis (25)', 'exploreListLabel(25)');
assert(!exploreListLabel(25).includes('todos'), 'sem falso todos');

const critical = sortCriticalEvents([
  { severity: 'LOW', at: '2026-01-02T00:00:00Z' },
  { severity: 'CRITICAL', at: '2026-01-01T00:00:00Z' },
  { severity: 'HIGH', at: '2026-01-03T00:00:00Z' },
]);
assert(critical[0].severity === 'CRITICAL', 'critical sort severity');

const incidents = sortCorrelationIncidents([
  { incidentId: 'a', status: 'CLOSED', severity: 'CRITICAL', riskScore: 90 },
  { incidentId: 'b', status: 'OPEN', severity: 'LOW', riskScore: 10 },
]);
assert(incidents[0].status === 'OPEN', 'correlation OPEN first');

assert(previewMeta(10, 25) === '10 de 25 no payload', 'previewMeta partial');

console.log(`legacyDashboardUtils volume tests: ${failed === 0 ? 'OK' : `${failed} failure(s)`}`);
process.exit(failed ? 1 : 0);
