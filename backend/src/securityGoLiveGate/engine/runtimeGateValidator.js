'use strict';

/**
 * SEC-21A — Runtime stability gate.
 */

const os = require('os');
const { execSync } = require('child_process');

function validateRuntimeGate() {
  const mem = process.memoryUsage();
  const load = os.loadavg();
  const cpus = os.cpus().length || 1;
  const loadPerCpu = load[0] / cpus;

  let pm2Restarts = null;
  try {
    const list = JSON.parse(execSync('pm2 jlist 2>/dev/null', { encoding: 'utf8', timeout: 5000 }));
    const backend = list.find((p) => p.name === 'impetus-backend');
    pm2Restarts = backend?.pm2_env?.restart_time ?? backend?.pm2_env?.unstable_restarts ?? 0;
  } catch (_e) {
    pm2Restarts = null;
  }

  const heapUsedMb = mem.heapUsed / 1024 / 1024;
  const rssMb = mem.rss / 1024 / 1024;
  const fdCount = (() => {
    try {
      return execSync(`ls /proc/${process.pid}/fd 2>/dev/null | wc -l`, { encoding: 'utf8' }).trim();
    } catch (_e) {
      return null;
    }
  })();

  const warnings = [];
  if (loadPerCpu > 2) warnings.push({ code: 'HIGH_CPU_LOAD', value: loadPerCpu });
  if (heapUsedMb > 512) warnings.push({ code: 'HIGH_HEAP_MB', value: heapUsedMb });
  if (pm2Restarts != null && pm2Restarts > 10) warnings.push({ code: 'PM2_RESTARTS', value: pm2Restarts });

  const blocking = loadPerCpu > 4 || heapUsedMb > 1024;

  return {
    ok: !blocking,
    cpu: { load1: load[0], loadPerCpu, cpus },
    memory: { heapUsedMb: Math.round(heapUsedMb), rssMb: Math.round(rssMb), freeMb: Math.round(os.freemem() / 1024 / 1024) },
    eventLoop: { uptimeSec: Math.round(process.uptime()) },
    pm2Restarts,
    fdCount: fdCount ? Number(fdCount) : null,
    warnings,
    blocking,
    runtimeStable: !blocking
  };
}

module.exports = { validateRuntimeGate };
