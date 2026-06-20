'use strict';

/**
 * M1.22 — Operational Roadmap Consolidation Test
 * node src/tests/m1/M1_22OperationalRoadmapConsolidation.test.js
 */

const path = require('path');
const fs = require('fs');

let _passed = 0;
let _failed = 0;

function assert(c, m) {
  if (!c) throw new Error(m);
}

async function test(name, fn) {
  try {
    await fn();
    _passed++;
    console.log(`  ✓  ${name}`);
  } catch (e) {
    _failed++;
    console.error(`  ✗  ${name}`);
    console.error(`     ${e.message}`);
  }
}

async function main() {
  console.log('\n[M1.22] Operational Roadmap Consolidation\n');

  await test('M1.22 doc exists', () => {
    const p = path.resolve(__dirname, '../../../docs/M1_22_OPERATIONAL_ROADMAP_CONSOLIDATION.md');
    assert(fs.existsSync(p), 'doc missing');
  });

  await test('Service exports', () => {
    const svc = require('../../services/audit/m1OperationalRoadmapConsolidationService');
    assert(svc.PHASE === 'M1.22', 'phase');
    assert(typeof svc.runM122OperationalRoadmapConsolidation === 'function', 'run fn');
  });

  await test('Routes load (5 endpoints)', () => {
    const r = require('../../routes/m1OperationalRoadmapRoutes');
    assert(r.stack?.length === 5, '5 routes');
  });

  await test('Consolidated status structure', async () => {
    const svc = require('../../services/audit/m1OperationalRoadmapConsolidationService');
    const out = await svc.runM122OperationalRoadmapConsolidation();
    assert(out.phase === 'M1.22', 'phase');
    assert(out.pass === true, 'pass');
    assert(out.executive_summary.enterprise_core_complete === true, 'enterprise core');
    assert(Array.isArray(out.executive_summary.remaining_operational_domains), 'domains array');
    assert(out.p17_p20.answer.aioi_cognitive_p17_p20_open_and_prohibited === true, 'AIOI P17-P20 prohibited');
    assert(out.p17_p20.answer.infra_p17_p18_superseded_by_m1_19 === true, 'infra P17-P18 M1.19');
    assert(out.roadmap.sequence_recommended.length >= 7, 'roadmap sequence');
    assert(out.not_implementable_in_code.length >= 5, 'blocked items listed');
  });

  await test('P0 reinterpretation includes P0A-P0E', () => {
    const svc = require('../../services/audit/m1OperationalRoadmapConsolidationService');
    const p0 = svc.assessP0LegacyReinterpretation();
    assert(p0.phases.P0A.status === 'open', 'P0A open');
    assert(p0.phases.P0D.status === 'partial', 'P0D partial');
  });

  console.log(`\n[M1.22] ${_passed} passed, ${_failed} failed\n`);
  process.exit(_failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
