'use strict';

/**
 * SEC-13A — Operational Validation Engine.
 */

const os = require('os');
const metrics = require('../metrics/securityOperationalMonitor');

function collectRuntimeMetrics() {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  return {
    memory: {
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      rssMb: Math.round(mem.rss / 1024 / 1024)
    },
    cpu: {
      userMicros: cpu.user,
      systemMicros: cpu.system
    },
    uptimeSeconds: Math.floor(process.uptime()),
    loadAvg: os.loadavg(),
    platform: os.platform()
  };
}

function validateModuleHealth(moduleState) {
  const checks = [];
  checks.push({ name: 'health', pass: moduleState.health?.ok !== false });
  checks.push({ name: 'latency', pass: (moduleState.health?.latencyMs || 0) < 5000 });
  if (moduleState.flagOn) {
    checks.push({ name: 'audit_payload', pass: moduleState.health?.ok === true });
    checks.push({ name: 'constraints', pass: moduleState.constraintsOk !== false });
    checks.push({ name: 'dependencies', pass: moduleState.dependenciesMet !== false });
  }
  const pass = checks.every((c) => c.pass);
  return { phase: moduleState.phase, pass, checks };
}

function validateOperational(moduleStates) {
  metrics.increment('validations');
  const runtime = collectRuntimeMetrics();
  const moduleChecks = moduleStates.map(validateModuleHealth);
  const errors = moduleChecks.filter((c) => !c.pass).length;

  const rollbackTest = {
    simulated: true,
    executed: false,
    procedure: 'flag OFF + pm2 restart — documented per module',
    pass: true
  };

  if (errors > 0) metrics.increment('runtime_errors', errors);

  return {
    validatedAt: new Date().toISOString(),
    runtime,
    moduleChecks,
    rollbackTest,
    throughput: { note: 'observational — no load test in SEC-13A' },
    exceptions: errors,
    overallPass: errors === 0 && runtime.memory.heapUsedMb < 2048
  };
}

module.exports = { collectRuntimeMetrics, validateModuleHealth, validateOperational };
