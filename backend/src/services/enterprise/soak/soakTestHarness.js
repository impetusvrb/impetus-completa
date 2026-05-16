'use strict';

/**
 * Enterprise Readiness — Soak Test Harness.
 * Utilitários compartilhados para testes de stress/soak.
 */

function nowMs() { return Date.now(); }

function heapMB() {
  const h = process.memoryUsage();
  return Math.round(h.heapUsed / 1024 / 1024 * 10) / 10;
}

function throughput(count, elapsedMs) {
  return elapsedMs > 0 ? Math.round((count / elapsedMs) * 1000) : 0;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class SoakAssert {
  constructor(suiteName) {
    this.suite = suiteName;
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  }

  ok(label, condition, detail = '') {
    if (condition) {
      console.log(`  ✓ ${label}`);
      this.passed++;
      this.results.push({ label, ok: true });
    } else {
      console.error(`  ✗ ${label}${detail ? ' — ' + detail : ''}`);
      this.failed++;
      this.results.push({ label, ok: false, detail });
    }
  }

  threshold(label, value, max, unit = '') {
    const ok = value <= max;
    const msg = `${value}${unit} (threshold ≤ ${max}${unit})`;
    this.ok(`${label}: ${msg}`, ok, ok ? '' : `EXCEEDED: ${value}${unit}`);
  }

  min(label, value, min, unit = '') {
    const ok = value >= min;
    const msg = `${value}${unit} (min ≥ ${min}${unit})`;
    this.ok(`${label}: ${msg}`, ok, ok ? '' : `BELOW MIN: ${value}${unit}`);
  }

  summary() {
    const status = this.failed === 0 ? 'PASS' : 'FAIL';
    console.log(`\n  [${status}] ${this.suite}: ${this.passed} passed, ${this.failed} failed`);
    return { suite: this.suite, passed: this.passed, failed: this.failed, status };
  }
}

module.exports = { nowMs, heapMB, throughput, sleep, SoakAssert };
