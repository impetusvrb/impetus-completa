'use strict';

/**
 * Observability & Monitoring Engine — testes offline.
 * Executar: node src/tests/observabilityScenarios.js
 */

const assert = require('assert');
const observabilityService = require('../services/observabilityService');

function testIncrementAndSnapshot() {
  observabilityService.resetAllMetrics();
  observabilityService.incrementMetric('total_requests', 2);
  observabilityService.incrementMetric('ai_responses_generated');
  observabilityService.recordLatency('cognitive_council', 100);
  observabilityService.recordLatency('cognitive_council', 200);
  const snap = observabilityService.getMetricsSnapshot();
  assert.strictEqual(snap.total_requests, 2);
  assert.strictEqual(snap.ai_responses_generated, 1);
  assert.strictEqual(snap.average_response_time, 150);
  observabilityService.incrementMetric('unknown_metric', 99);
  const snap2 = observabilityService.getMetricsSnapshot();
  assert.strictEqual(snap2.total_requests, 2);
}

function testConsecutiveErrorsCritical() {
  observabilityService.resetAllMetrics();
  for (let i = 0; i < observabilityService.DEFAULT_THRESHOLDS.consecutive_errors_critical; i++) {
    observabilityService.markCouncilException({
      traceId: `t-${i}`,
      companyId: '00000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000002',
      err: new Error('fail')
    });
  }
  const h = observabilityService.evaluateSystemHealth();
  assert.strictEqual(h.status, 'CRITICAL');
  assert.ok(h.alerts.some((a) => a.includes('consecutivos')));
}

function testBlockSpikeWarning() {
  observabilityService.resetAllMetrics();
  const n = observabilityService.DEFAULT_THRESHOLDS.blocks_warning_count + 2;
  for (let i = 0; i < n; i++) {
    observabilityService.markCouncilBlocked({
      traceId: `b-${i}`,
      companyId: '00000000-0000-0000-0000-000000000003',
      userId: null,
      reason: 'test',
      riskLevel: 'medium',
      responseMode: 'none'
    });
  }
  const h = observabilityService.evaluateSystemHealth();
  assert.strictEqual(h.status, 'WARNING');
  assert.ok(h.alerts.some((a) => a.includes('bloqueios')));
}

function testLogEventJsonShape() {
  const chunks = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, enc, cb) => {
    chunks.push(String(chunk));
    if (typeof cb === 'function') cb();
    return true;
  };
  try {
    observabilityService.logEvent('INFO', 'TEST_EVENT', {
      trace_id: 'abc',
      company_id: 'c1',
      user_id: 'u1',
      details: { safe: 'x', password: 'secret' }
    });
  } finally {
    process.stdout.write = orig;
  }
  const line = JSON.parse(chunks.join('').trim());
  assert.strictEqual(line.level, 'INFO');
  assert.strictEqual(line.event, 'TEST_EVENT');
  assert.strictEqual(line.trace_id, 'abc');
  assert.strictEqual(line.details.password, '[redacted]');
}

function testSystemHealthPayload() {
  observabilityService.resetAllMetrics();
  observabilityService.incrementMetric('total_requests');
  const p = observabilityService.getSystemHealthPayload();
  assert.ok(p.metrics);
  assert.ok(['OK', 'WARNING', 'CRITICAL'].includes(p.system_status));
  assert.ok(Array.isArray(p.alerts));
  assert.ok(p.timestamp);
}

function testIncidentSpikeWarning() {
  observabilityService.resetAllMetrics();
  const n = observabilityService.DEFAULT_THRESHOLDS.incidents_warning_count + 1;
  for (let i = 0; i < n; i++) {
    observabilityService.markCouncilSuccess({
      traceId: `inc-${i}`,
      companyId: '00000000-0000-0000-0000-000000000010',
      userId: 'u',
      durationMs: 5,
      riskLevel: 'low',
      responseMode: 'full',
      policyEffect: 'none',
      policyViolation: true,
      complianceIncident: false,
      degraded: false,
      module: 'cognitive_council'
    });
  }
  const h = observabilityService.evaluateSystemHealth();
  assert.strictEqual(h.status, 'WARNING');
  assert.ok(h.alerts.some((a) => a.includes('incidentes')));
}

function testTenantRollup() {
  observabilityService.resetAllMetrics();
  const cid = '00000000-0000-0000-0000-000000000099';
  observabilityService.markCouncilStart({
    traceId: 't1',
    companyId: cid,
    userId: 'u',
    module: 'x'
  });
  observabilityService.markCouncilBlocked({
    traceId: 't2',
    companyId: cid,
    userId: 'u',
    reason: 'adaptive_governance',
    riskLevel: 'high',
    responseMode: 'none'
  });
  const snap = observabilityService.getMetricsSnapshot();
  assert.strictEqual(snap.by_tenant[cid].requests, 1);
  assert.strictEqual(snap.by_tenant[cid].blocks, 1);
}

const suite = [
  testIncrementAndSnapshot,
  testConsecutiveErrorsCritical,
  testBlockSpikeWarning,
  testIncidentSpikeWarning,
  testLogEventJsonShape,
  testSystemHealthPayload,
  testTenantRollup
];

let failed = false;
for (const t of suite) {
  try {
    t();
    console.log('OK', t.name);
  } catch (e) {
    failed = true;
    console.error('FAIL', t.name, e);
  }
}
if (failed) process.exit(1);
console.log('observabilityScenarios: all passed');
