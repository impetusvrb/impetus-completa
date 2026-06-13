/**
 * AIOI-P3.1 — Operational Evidence Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const SRC = path.join(BACKEND_ROOT, 'src');

function readDoc(n) { const p = path.join(DOCS, n); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function readSrc(r) { const p = path.join(SRC, r); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function stripComments(c) { return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n'); }

const evidenceService = require('../../services/aioi/aioiOperationalEvidenceService');

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P3.1 — Operational Evidence Audit\n');

  await test('OE-DOC: AIOI_OPERATIONAL_EVIDENCE_SPECIFICATION.md', () => {
    assert(readDoc('AIOI_OPERATIONAL_EVIDENCE_SPECIFICATION.md'));
  });

  await test('OE-01: aioiOperationalEvidenceService.js existe', () => {
    assert(readSrc('services/aioi/aioiOperationalEvidenceService.js'));
  });

  await test('OE-02: collectOperationalEvidence exportado', () => {
    assert(typeof evidenceService.collectOperationalEvidence === 'function');
  });

  await test('OE-03: registerOperationalSnapshot exportado', () => {
    assert(typeof evidenceService.registerOperationalSnapshot === 'function');
  });

  await test('OE-04: throughput registrado', () => {
    const c = readSrc('services/aioi/aioiOperationalEvidenceService.js');
    assert(c.includes('throughput'));
    assert(c.includes('classification_rate'));
  });

  await test('OE-05: latência registrada', () => {
    const c = readSrc('services/aioi/aioiOperationalEvidenceService.js');
    assert(c.includes('avg_outbox_latency_ms'));
  });

  await test('OE-06: SLA compliance na evidência', () => {
    const c = readSrc('services/aioi/aioiOperationalEvidenceService.js');
    assert(c.includes('sla_compliance'));
  });

  await test('OE-07: error_rate e dlq_utilization', () => {
    const c = readSrc('services/aioi/aioiOperationalEvidenceService.js');
    assert(c.includes('error_rate_pct'));
    assert(c.includes('dlq_utilization_pct'));
  });

  await test('OE-08: Sem alterar filas/classificação', () => {
    const c = stripComments(readSrc('services/aioi/aioiOperationalEvidenceService.js'));
    assert(!c.includes('UPDATE industrial_operational_events'));
    assert(!c.includes('classifyIoe'));
  });

  await test('OE-09: Snapshots ring buffer', () => {
    assert(typeof evidenceService.getRecentSnapshots === 'function');
    const c = readSrc('services/aioi/aioiOperationalEvidenceService.js');
    assert(c.includes('MAX_SNAPSHOTS'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
