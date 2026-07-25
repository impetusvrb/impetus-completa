'use strict';

/**
 * INC-032 — KPIs Centro de Comando ↔ quality_inspections
 */
const db = require('../../src/db');
const dashboardKPIs = require('../../src/services/dashboardKPIs');
const { countNonConformingInspections, getNcrCapaSummary } = require('../../src/services/qualityIntelligenceService');

let passed = 0;
let failed = 0;

function assert(c, m) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
  }
}

const TENANT = '511f4819-fc48-479e-b11e-49ba4fb9c81b';

async function testCountInspections() {
  console.log('\n=== countNonConformingInspections ===');
  const n = await countNonConformingInspections(TENANT);
  assert(typeof n === 'number', 'returns numeric count');
  assert(n >= 0, 'non-negative');
}

async function testNcrSummaryParity() {
  console.log('\n=== getNcrCapaSummary parity ===');
  const summary = await getNcrCapaSummary(TENANT);
  const direct = await countNonConformingInspections(TENANT);
  assert(summary.inspections_non_conforming === direct, 'summary matches direct count');
}

async function testQualityKpisSource() {
  console.log('\n=== getQualityKpis source ===');
  const user = await db.query(
    `SELECT u.* FROM users u WHERE u.email = 'ricardo.souza@impetus.com.br' AND u.company_id = $1 LIMIT 1`,
    [TENANT]
  );
  const u = user.rows[0];
  assert(!!u, 'manager_quality user exists');
  const kpis = await dashboardKPIs.getDashboardKPIs(u, null);
  const openNc = kpis.find((k) => k.id === 'open_nc' || k.key === 'open_nc');
  assert(openNc?.source === 'quality_inspections', 'open_nc sourced from quality_inspections');
  assert(openNc?.value === summaryExpected(await countNonConformingInspections(TENANT)), 'open_nc value matches inspections');
  assert(!kpis.some((k) => k.id === 'k2' && k.title === 'Propostas pendentes'), 'no proposals k2 for quality manager');
}

function summaryExpected(n) {
  return n != null ? n : '—';
}

async function testDashboardSummaryQualityBlock() {
  console.log('\n=== getDashboardSummary quality block ===');
  const user = await db.query(
    `SELECT u.* FROM users u WHERE u.email = 'ricardo.souza@impetus.com.br' AND u.company_id = $1 LIMIT 1`,
    [TENANT]
  );
  const summary = await dashboardKPIs.getDashboardSummary(user.rows[0]);
  assert(summary.quality_inspections?.source === 'quality_inspections', 'quality_inspections block present');
  assert(typeof summary.quality_inspections?.non_conforming === 'number', 'non_conforming numeric');
}

async function run() {
  await testCountInspections();
  await testNcrSummaryParity();
  await testQualityKpisSource();
  await testDashboardSummaryQualityBlock();
  console.log(`\n=== INC-032 Command Center KPI: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
