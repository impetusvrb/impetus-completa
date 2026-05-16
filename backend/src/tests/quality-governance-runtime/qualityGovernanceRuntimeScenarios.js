'use strict';

/**
 * Quality governance runtime — SPC/FMEA smoke tests (no DB).
 */
const assert = require('assert');
const { evaluateSubgroupsSpc, xbarControlLimits } = require('../../domains/quality/governance/spc/qualitySpcEngine');
const { capabilityIndices } = require('../../domains/quality/governance/spc/qualityProcessCapabilityEngine');
const { rankFmeaRows } = require('../../domains/quality/governance/risk/qualityFmeaRuntime');
const { buildSupplierScorecard } = require('../../domains/quality/governance/supplier/qualitySupplierScorecard');

function test(name, fn) {
  try {
    fn();
    console.log('  ✅', name);
  } catch (e) {
    console.error('  ❌', name, e.message);
    process.exitCode = 1;
  }
}

test('X-bar limites calculados para subgrupos n=5', () => {
  const sg = [
    [10, 10.1, 9.9, 10.2, 10.0],
    [10.1, 10.0, 10.2, 9.9, 10.0],
    [10.0, 10.0, 10.1, 10.0, 9.9]
  ];
  const lim = xbarControlLimits(sg);
  assert.ok(lim.center != null);
  assert.ok(lim.ucl > lim.center);
  assert.ok(lim.lcl < lim.center);
});

test('SPC detecta violação com subgrupo fora de controlo', () => {
  const sg = [
    [10, 10, 10, 10, 10],
    [10, 10, 10, 10, 10],
    [20, 20, 20, 20, 20]
  ];
  const r = evaluateSubgroupsSpc(sg);
  assert.strictEqual(r.ok, true);
  assert.ok(r.violation_count > 0);
});

test('Cpk calculado com USL/LSL', () => {
  const samples = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i / 3) * 0.5);
  const c = capabilityIndices(samples, 102, 98);
  assert.ok(c.ppk != null);
  assert.ok(Number.isFinite(c.ppk));
});

test('FMEA RPN ordena por risco', () => {
  const rows = [
    { id: 'a', severity: 8, occurrence: 4, detection: 3 },
    { id: 'b', severity: 5, occurrence: 5, detection: 5 }
  ];
  const r = rankFmeaRows(rows);
  assert.ok(r[0].rpn >= r[1].rpn);
});

test('Scorecard fornecedor agrega PPM', () => {
  const sc = buildSupplierScorecard('sup-1', [{ inspected: 1000, defects: 5, lots: 10, rejected_lots: 0 }]);
  assert.ok(sc.ppm > 0);
});

console.log('\n══ quality-governance-runtime (backend) ══');
if (process.exitCode) console.log('Falhou.');
else console.log('OK.');
