'use strict';

/**
 * Truth Program + AIOI-P0 Closure Registry Test
 * node src/tests/truth/TruthProgramClosureRegistry.test.js
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

const DOCS = path.resolve(__dirname, '../../../docs');

const CANONICAL_DOCS = [
  'COGNITIVE_FLOW_MASTER_MAP.md',
  'TRUTH_COVERAGE_FINAL_AUDIT.md',
  'DATA_GENERATION_AUDIT_SCENARIOS_ABC.md',
  'ANAM_TRUTH_AUDIT_REPORT.md',
  'TRUTH_SOURCE_INVENTORY.md',
  'OPERATIONAL_TRUTH_GAP_REPORT.md',
  'TRUTH_PROGRAM_FINAL_CORRECTION_PLAN.md',
  'TRUTH_PROGRAM_ETAPAS_CLOSURE_REGISTRY.md',
  'ETAPA10_FINAL_CERTIFICATION.md',
  'EMPTY_FACTORY_CERTIFICATION_EXECUTION_REPORT.md',
];

async function main() {
  console.log('\n[Truth Program] Closure Registry + AIOI-P0\n');

  for (const doc of CANONICAL_DOCS) {
    await test(`Doc exists: ${doc}`, () => {
      assert(fs.existsSync(path.join(DOCS, doc)), `missing ${doc}`);
      const size = fs.statSync(path.join(DOCS, doc)).size;
      assert(size > 200, `${doc} too small (${size} bytes)`);
    });
  }

  await test('IOE schema module', () => {
    const schema = require('../../schemas/industrialOperationalEvent.schema');
    assert(typeof schema.validateIoePayload === 'function', 'validateIoePayload');
    const bad = schema.validateIoePayload({});
    assert(bad.ok === false && bad.errors.length > 0, 'rejects empty');
    const good = schema.validateIoePayload({
      company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b',
      tenant_key: '511f4819-fc48-479e-b11e-49ba4fb9c81b',
      idempotency_key: 'test:task:1:2026-06-28T10',
      correlation_id: 'ioe-test',
      source_type: 'task',
      category: 'task_overdue',
      entity_type: 'task',
    });
    assert(good.ok === true, 'accepts valid minimal');
  });

  await test('Ingestion uses schema module', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../services/aioi/aioiEventIngestionService.js'),
      'utf8'
    );
    assert(src.includes("require('../../schemas/industrialOperationalEvent.schema')"), 'schema import');
    assert(!src.includes('function _validateIoePayload'), 'no duplicate validator');
  });

  await test('workOrderAioiAdapter facade', () => {
    const wo = require('../../services/aioi/workOrderAioiAdapter');
    assert(typeof wo.adaptAndIngestWorkOrder === 'function', 'adaptAndIngestWorkOrder');
    const payload = wo.buildWorkOrderIoePayload({
      companyId: '511f4819-fc48-479e-b11e-49ba4fb9c81b',
      tenantKey: '511f4819-fc48-479e-b11e-49ba4fb9c81b',
      record: { id: 'wo-1', priority: 'critical', title: 'Test WO' },
    });
    assert(payload.source_type === 'work_order', 'source_type work_order');
  });

  await test('Criticality + Priority engine facades', () => {
    const crit = require('../../services/aioi/aioiCriticalityEngine');
    const prio = require('../../services/aioi/aioiPriorityEngine');
    assert(crit.resolveCriticity('equipment_failure') === 'CRITICAL', 'criticity');
    assert(prio.resolvePriorityBand({ category: 'equipment_failure' }) === 'critical', 'priority');
  });

  await test('Registry lists 9 TOTAL etapas', () => {
    const reg = fs.readFileSync(path.join(DOCS, 'TRUTH_PROGRAM_ETAPAS_CLOSURE_REGISTRY.md'), 'utf8');
    assert(reg.includes('Etapas TOTAL | 9 / 10'), 'registry verdict');
    assert(reg.includes('DATA_GENERATION_AUDIT_SCENARIOS_ABC'), 'etapa 3 linked');
    assert(reg.includes('OPERATIONAL_TRUTH_GAP_REPORT'), 'etapa 8 linked');
  });

  console.log(`\n[Truth Program] ${_passed} passed, ${_failed} failed\n`);
  process.exit(_failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
