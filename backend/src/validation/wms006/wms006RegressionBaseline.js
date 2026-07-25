'use strict';

/**
 * Baseline congelado WMS-005 — comparação de regressão (read-only).
 */

const WMS005_BASELINE = Object.freeze({
  phase: 'WMS-005',
  date: '2026-07-18',
  scenarios: Object.freeze([
    { id: 'procurement_receiving', expected: 'PASS' },
    { id: 'inventory_picking', expected: 'PASS' },
    { id: 'inventory_shipping', expected: 'PASS' },
    { id: 'warehouse_transfer', expected: 'PASS' },
    { id: 'cognitive_integrated', expected: 'PASS' }
  ]),
  integrated_validation: true,
  cross_domain: true,
  verdict: 'READY FOR WMS-006'
});

function compareWithWms005Baseline(currentResults = []) {
  const issues = [];
  const rows = WMS005_BASELINE.scenarios.map((baseline) => {
    const current = currentResults.find((r) => r.scenario_id === baseline.id);
    const currentResult = current?.pass ? 'PASS' : current ? 'FAIL' : 'MISSING';
    const ok = currentResult === baseline.expected;
    if (!ok) issues.push(`regression:${baseline.id}:${currentResult}`);
    return Object.freeze({
      scenario_id: baseline.id,
      wms005: baseline.expected,
      wms006: currentResult,
      ok
    });
  });

  const valid = issues.length === 0 && currentResults.length === WMS005_BASELINE.scenarios.length;
  return Object.freeze({
    valid,
    issues,
    baseline: WMS005_BASELINE,
    rows,
    no_regression: valid
  });
}

module.exports = {
  WMS005_BASELINE,
  compareWithWms005Baseline
};
