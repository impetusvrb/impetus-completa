'use strict';

/**
 * SEC-21A — Infrastructure gate (read-only probes).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const flags = require('../config/securityGoLiveGateFlags');
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

function validateInfrastructureGate() {
  if (flags.skipInfraProbes()) {
    return { ok: true, skipped: true, blocking: false, checks: {} };
  }

  const checks = {};

  checks.nginxConfig = {
    ok: fs.existsSync(path.join(REPO, 'infra/nginx/impetus-hardening-locations.conf')),
    path: 'infra/nginx/impetus-hardening-locations.conf'
  };

  checks.nginxRunning = safeExec('systemctl is-active nginx 2>/dev/null || pgrep -x nginx');
  checks.nginxHealthy = checks.nginxRunning.ok;

  const pm2Probe = safeExec('pm2 jlist 2>/dev/null');
  const pm2Processes = pm2Probe.ok ? sanitizePm2ProcessList(pm2Probe.output) : [];
  checks.pm2 = {
    ok: pm2Probe.ok,
    output: REDACTED,
    processes: pm2Processes,
    ...(pm2Probe.ok ? {} : { error: 'pm2_probe_failed' })
  };
  let pm2Healthy = false;
  if (checks.pm2.ok && pm2Processes.length > 0) {
    const backend = pm2Processes.find((processInfo) => processInfo.name === 'impetus-backend');
    pm2Healthy = backend?.status === 'online';
    checks.pm2Detail = {
      backendStatus: backend?.status || 'unknown',
      restarts: backend?.restart_time ?? null
    };
  }
  checks.pm2Healthy = { ok: pm2Healthy };

  checks.health = safeExec('curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/health 2>/dev/null');
  checks.healthEndpoint = {
    ok: checks.health.ok && (checks.health.output === '200' || checks.health.output === '204'),
    code: checks.health.output
  };

  checks.postgres = safeExec('pg_isready -h 127.0.0.1 -p 5432 2>/dev/null');
  checks.databaseHealthy = { ok: checks.postgres.ok };

  checks.redis = safeExec('redis-cli ping 2>/dev/null');
  checks.redisPresent = checks.redis.ok && checks.redis.output === 'PONG';
  checks.redisRequired = false;

  checks.mqtt = safeExec('ss -ltn 2>/dev/null | grep ":1883"');
  checks.mqttPresent = checks.mqtt.ok && checks.mqtt.output.includes('1883');

  checks.tls = safeExec('test -d /etc/letsencrypt/live && echo ok');
  checks.tlsValid = { ok: checks.tls.ok };

  checks.ufw = safeExec('ufw status 2>/dev/null | head -1');
  checks.firewall = { ok: checks.ufw.ok, status: checks.ufw.output?.slice(0, 40) };

  checks.ssh = safeExec('ss -ltn 2>/dev/null | grep ":22"');
  checks.sshListening = { ok: checks.ssh.ok };

  const blocking =
    !checks.nginxConfig.ok ||
    !checks.pm2Healthy.ok ||
    !checks.healthEndpoint.ok ||
    !checks.databaseHealthy.ok;

  return {
    ok: !blocking,
    checks,
    blocking,
    pm2Healthy: checks.pm2Healthy.ok,
    nginxHealthy: checks.nginxConfig.ok && checks.nginxHealthy,
    databaseHealthy: checks.databaseHealthy.ok,
    tlsValid: checks.tlsValid.ok
  };
}

module.exports = { validateInfrastructureGate };
