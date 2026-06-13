/**
 * AIOI-ORG-5 — SLA Engine Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const slaEngine = require('../../services/aioi/aioiSlaEngineService');

function readDoc(n) { return fs.readFileSync(path.join(DOCS, n), 'utf8'); }

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-ORG-5 — SLA Engine Audit\n');

  await test('SL1: AIOI_SLA_ENGINE_SPECIFICATION.md existe', () => {
    const d = readDoc('AIOI_SLA_ENGINE_SPECIFICATION.md');
    assert(d.includes('calculateDueDate'));
  });

  await test('SL2: calculateDueDate retorna ISO string', () => {
    const due = slaEngine.calculateDueDate('CRITICAL_4H', new Date('2026-06-10T08:00:00Z'));
    assert(typeof due === 'string');
    assert(new Date(due).getTime() > new Date('2026-06-10T08:00:00Z').getTime());
  });

  await test('SL3: calculateAging positivo', () => {
    const aging = slaEngine.calculateAging(new Date(Date.now() - 2 * 3600000));
    assert(aging >= 1.9 && aging <= 2.1);
  });

  await test('SL4: detectBreach ON_TRACK', () => {
    assert.strictEqual(slaEngine.detectBreach(1, 'CRITICAL_4H'), 'ON_TRACK');
  });

  await test('SL5: detectBreach AT_RISK', () => {
    assert.strictEqual(slaEngine.detectBreach(3.5, 'CRITICAL_4H'), 'AT_RISK');
  });

  await test('SL6: detectBreach BREACHED', () => {
    assert.strictEqual(slaEngine.detectBreach(5, 'CRITICAL_4H'), 'BREACHED');
  });

  await test('SL7: detectEscalation LEVEL_0 default', () => {
    assert.strictEqual(slaEngine.detectEscalation('ON_TRACK', 'low'), 'LEVEL_0');
  });

  await test('SL8: detectEscalation BREACHED critical → LEVEL_3', () => {
    assert.strictEqual(slaEngine.detectEscalation('BREACHED', 'critical'), 'LEVEL_3');
  });

  await test('SL9: BREACH_STATES canónicos', () => {
    assert.deepStrictEqual([...slaEngine.BREACH_STATES], ['ON_TRACK', 'AT_RISK', 'BREACHED']);
  });

  await test('SL10: ESCALATION_LEVELS canónicos', () => {
    assert.deepStrictEqual([...slaEngine.ESCALATION_LEVELS], ['LEVEL_0', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3']);
  });

  await test('SL11: computeSlaSnapshot completo', () => {
    const snap = slaEngine.computeSlaSnapshot({
      priority_band: 'critical',
      created_at: new Date(Date.now() - 3600000).toISOString()
    });
    assert(snap.sla_class === 'CRITICAL_4H');
    assert(snap.breach_state);
    assert(snap.escalation_level);
    assert(typeof snap.aging_hours === 'number');
  });

  await test('SL12: Migration SLA columns', () => {
    const m = fs.readFileSync(path.join(BACKEND_ROOT, 'migrations/aioi_org5_workflow_sla_migration.sql'), 'utf8');
    assert(m.includes('sla_class'));
    assert(m.includes('due_at'));
    assert(m.includes('breach_state'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
