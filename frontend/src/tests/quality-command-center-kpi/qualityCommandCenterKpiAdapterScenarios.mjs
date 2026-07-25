/**
 * INC-032 — Adapter KPIs CC quality ↔ quality_inspections
 */
import {
  buildQualityCommandCenterKpiView,
  isQualityCommandCenterProfile,
  resolveQualityNcMetrics,
  QUALITY_KPI_EMPTY
} from '../../features/dashboard/centroComando/qualityCommandCenterKpiAdapter.js';

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

console.log('\nINC-032 quality-command-center-kpi-adapter\n');

ok('detects manager_quality', isQualityCommandCenterProfile({ profile_code: 'manager_quality' }) === true);
ok('ignores production', isQualityCommandCenterProfile({ profile_code: 'manager_production' }) === false);

const ncr = { summary: { inspections_non_conforming: 9, ncr_open: 9, capa_in_progress: 9 } };
const metrics = resolveQualityNcMetrics(ncr, null);
ok('nc from ncr summary', metrics.inspections_non_conforming === 9);
ok('data available', metrics.data_available === true);

const view = buildQualityCommandCenterKpiView({
  meData: { profile_code: 'manager_quality', functional_area: 'quality' },
  summary: { ai_insights: { total: 3 }, operational_interactions: { total: 5 }, alerts: { critical: 1 } },
  ncrSummary: ncr
});
ok('hero NC value 9', view?.heroCriticalTasks?.value === 9);
ok('widget slot NC 9', view?.widgetFourthSlot?.value === 9);
ok('not unavailable', view?.nc?.unavailable === false);

const emptyView = buildQualityCommandCenterKpiView({
  meData: { profile_code: 'manager_quality' },
  summary: {},
  ncrSummary: null
});
ok('empty when no ncr', emptyView?.nc?.unavailable === true);
ok('empty display token', emptyView?.heroCriticalTasks?.display === QUALITY_KPI_EMPTY);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
