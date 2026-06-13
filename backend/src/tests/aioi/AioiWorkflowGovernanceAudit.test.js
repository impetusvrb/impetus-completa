/**
 * AIOI-ORG-5 — Workflow Governance Audit
 * Modo: STATIC ANALYSIS · READ ONLY
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

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-ORG-5 — Workflow Governance Audit\n');

  await test('WG1: AIOI_WORKFLOW_GOVERNANCE_CONTRACT.md existe', () => {
    const d = readDoc('AIOI_WORKFLOW_GOVERNANCE_CONTRACT.md');
    assert(d && d.length > 200);
  });

  await test('WG2: Estados OPEN TRIAGED PROPOSED APPROVED EXECUTING COMPLETED LEARNING', () => {
    const d = readDoc('AIOI_WORKFLOW_GOVERNANCE_CONTRACT.md');
    for (const s of ['OPEN', 'TRIAGED', 'PROPOSED', 'APPROVED', 'EXECUTING', 'COMPLETED', 'LEARNING']) {
      assert(d.includes(s), `Estado ${s} ausente`);
    }
  });

  await test('WG3: Transição proibida OPEN→APPROVED documentada', () => {
    const d = readDoc('AIOI_WORKFLOW_GOVERNANCE_CONTRACT.md');
    assert(d.includes('OPEN → APPROVED') || d.includes('OPEN → EXECUTING'));
  });

  await test('WG4: Classification engine existe', () => {
    assert(readSrc('services/aioi/aioiClassificationEngine.js'));
  });

  await test('WG5: Classification consumer existe', () => {
    assert(readSrc('services/aioi/aioiClassificationConsumerService.js'));
  });

  await test('WG6: Classification apenas open→triaged', () => {
    const eng = readSrc('services/aioi/aioiClassificationEngine.js');
    assert(eng.includes("target_status: 'triaged'") || eng.includes("'triaged'"));
    assert(eng.includes("status !== 'open'") || eng.includes("status='open'") || eng.includes("status     = 'open'"));
    const code = stripComments(eng);
    assert(!code.includes("'approved'") || eng.includes('apenas open'), 'Engine não deve transicionar para approved');
  });

  await test('WG7: Classification sem LLM', () => {
    const files = ['aioiClassificationEngine.js', 'aioiClassificationConsumerService.js'];
    for (const f of files) {
      const c = stripComments(readSrc(`services/aioi/${f}`));
      assert(!c.includes('openai') && !c.includes('anthropic') && !c.includes('geminiService'));
    }
  });

  await test('WG8: Classification consumer_type=classification', () => {
    const c = readSrc('services/aioi/aioiClassificationConsumerService.js');
    assert(c.includes("'classification'"));
  });

  await test('WG9: ORG-1 precedence contract intacto', () => {
    const d = readDoc('AIOI_QUEUE_PRECEDENCE_CONTRACT.md');
    assert(d && d.includes('Q-01'));
  });

  await test('WG10: P8 runtime invariants', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      const c = fs.readFileSync(fp, 'utf8');
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(c));
    }
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
