'use strict';

/**
 * Utilitários partilhados pelos testes de soak/stress enterprise.
 */

const results = { passed: 0, failed: 0, sections: [] };
let _currentSection = '';

function section(name) {
  _currentSection = name;
  console.log(`\n  [ ${name} ]`);
}

function pass(label, condition) {
  if (condition) {
    console.log(`    ✓ ${label}`);
    results.passed++;
  } else {
    console.error(`    ✗ ${label}`);
    results.failed++;
  }
}

function fail(label) {
  console.error(`    ✗ ${label}`);
  results.failed++;
}

function summarize(suiteName) {
  const p = results.passed;
  const f = results.failed;
  console.log(`\n  ${'─'.repeat(55)}`);
  console.log(`  ${suiteName}: ${p} passed, ${f} failed`);
  if (f > 0) process.exit(1);
}

/** Timer utilitário para métricas de latência. */
function timer() {
  const start = process.hrtime.bigint();
  return {
    elapsed() { return Number(process.hrtime.bigint() - start) / 1e6; } // ms
  };
}

/** Gera string de N caracteres (simulação de payload). */
function fakePayload(chars) {
  return 'X'.repeat(chars);
}

/** Gera UUID fake (sem dependência). */
function fakeId(prefix = 'ev') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

module.exports = { section, pass, fail, summarize, timer, fakePayload, fakeId, results };
