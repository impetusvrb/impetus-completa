'use strict';

const results = { passed: 0, failed: 0 };

function section(name) {
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

function summarize(suiteName) {
  console.log(`\n  ${'─'.repeat(55)}`);
  console.log(`  ${suiteName}: ${results.passed} passed, ${results.failed} failed`);
  if (results.failed > 0) process.exit(1);
}

function timer() {
  const start = process.hrtime.bigint();
  return { elapsed() { return Number(process.hrtime.bigint() - start) / 1e6; } };
}

function fakeId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

module.exports = { section, pass, summarize, timer, fakeId, results };
