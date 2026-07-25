'use strict';

/**
 * SEC-21C — Runtime + infraestrutura (read-only).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const flags = require('../config/securityGoLiveValidationFlags');
const {
  REDACTED,
  sanitizePm2ProcessList
} = require('../../securityApplication/diagnosticRedaction');

const REPO = path.resolve(__dirname, '../../../../');

function safeExec(cmd, timeoutMs = 5000) {
  try {
    return { ok: true, output: execSync(cmd, { encoding: 'utf8', timeout: timeoutMs }).trim() };
  } catch (e) {
    return { ok: false, error: e.message, output: (e.stdout || e.stderr || '').toString().trim() };
  }
}

function validateRuntimeHealth() {
  if (flags.skipInfraProbes()) {
    const mem = process.memoryUsage();
    return {
      ok: true,
      skipped: true,
      blocking: false,
      runtimeHealth: 'STABLE',
      infrastructureReady: true,
      checks: {
        cpu: { loadPerCpu: os.loadavg()[0] / (os.cpus().length || 1) },
        memory: { heapMb: Math.round(mem.heapUsed / 1024 / 1024), rssMb: Math.round(mem.rss / 1024 / 1024) }
      }
    };
  }

  const mem = process.memoryUsage();
  const load = os.loadavg();
  const cpus = os.cpus().length || 1;
  const loadPerCpu = load[0] / cpus;
  const heapMb = mem.heapUsed / 1024 / 1024;
  const rssMb = mem.rss / 1024 / 1024;
  const blocking = [];

  const checks = {};

  const pm2Probe = safeExec('pm2 jlist 2>/dev/null');
  const pm2Processes = pm2Probe.ok ? sanitizePm2ProcessList(pm2Probe.output) : [];
  checks.pm2 = {
    ok: pm2Probe.ok,
    output: REDACTED,
    processes: pm2Processes,
    ...(pm2Probe.ok ? {} : { error: 'pm2_probe_failed' })
  };
  let pm2Healthy = false;
  let backendOnline = false;
  let frontendOnline = false;
  let pm2Restarts = null;
  if (checks.pm2.ok) {
    if (pm2Processes.length > 0) {
      const backend = pm2Processes.find((processInfo) => processInfo.name === 'impetus-backend');
      const frontend = pm2Processes.find((processInfo) => /impetus-frontend|frontend/.test(processInfo.name || ''));
      pm2Healthy = backend?.status === 'online';
      backendOnline = pm2Healthy;
      frontendOnline = frontend?.status === 'online' || fs.existsSync(path.join(REPO, 'frontend/dist/index.html'));
      pm2Restarts = backend?.restart_time ?? 0;
    }
  }
  checks.pm2Healthy = pm2Healthy;
  checks.backendOnline = backendOnline;
  checks.frontendOnline = frontendOnline;
  checks.pm2Restarts = pm2Restarts;

  checks.health = safeExec('curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/health 2>/dev/null');
  checks.healthEndpoint = checks.health.ok && ['200', '204'].includes(checks.health.output);

  checks.nginxConfig = fs.existsSync(path.join(REPO, 'infra/nginx/impetus-hardening-locations.conf'));
  checks.nginxRunning = safeExec('systemctl is-active nginx 2>/dev/null || pgrep -x nginx');
  checks.nginxHealthy = checks.nginxConfig && checks.nginxRunning.ok;

  checks.postgres = safeExec('pg_isready -h 127.0.0.1 -p 5432 2>/dev/null');
  checks.databaseHealthy = checks.postgres.ok;

  checks.redis = safeExec('redis-cli ping 2>/dev/null');
  checks.redisPresent = checks.redis.ok && checks.redis.output === 'PONG';
  checks.redisRequired = false;

  checks.mqtt = safeExec('ss -ltn 2>/dev/null | grep ":1883"');
  checks.mqttPresent = checks.mqtt.ok;

  checks.tls = safeExec('test -d /etc/letsencrypt/live && echo ok');
  checks.tlsValid = checks.tls.ok;

  if (!pm2Healthy) blocking.push({ code: 'PM2_UNHEALTHY' });
  if (!backendOnline) blocking.push({ code: 'BACKEND_OFFLINE' });
  if (!checks.healthEndpoint) blocking.push({ code: 'HEALTH_ENDPOINT_FAIL' });
  if (!checks.nginxHealthy) blocking.push({ code: 'NGINX_UNHEALTHY' });
  if (!checks.databaseHealthy) blocking.push({ code: 'DATABASE_UNAVAILABLE' });
  if (loadPerCpu > 4) blocking.push({ code: 'HIGH_CPU', value: loadPerCpu });
  if (heapMb > 1024) blocking.push({ code: 'HIGH_HEAP', value: heapMb });
  if (pm2Restarts != null && pm2Restarts > 15) blocking.push({ code: 'PM2_RESTARTS_HIGH', value: pm2Restarts });

  const runtimeStable = blocking.filter((b) => ['HIGH_CPU', 'HIGH_HEAP', 'PM2_RESTARTS_HIGH'].includes(b.code)).length === 0;
  const infrastructureReady =
    pm2Healthy && backendOnline && checks.nginxHealthy && checks.databaseHealthy && checks.healthEndpoint;

  return {
    ok: blocking.length === 0,
    blocking: blocking.length > 0,
    runtimeHealth: runtimeStable && infrastructureReady ? 'STABLE' : 'UNSTABLE',
    infrastructureReady,
    runtimeStable,
    checks,
    resources: {
      cpu: { load1: load[0], loadPerCpu, cpus },
      memory: { heapMb: Math.round(heapMb), rssMb: Math.round(rssMb) },
      eventLoop: { uptimeSec: Math.round(process.uptime()) },
      pm2Restarts
    },
    blockingFindings: blocking
  };
}

module.exports = { validateRuntimeHealth };
