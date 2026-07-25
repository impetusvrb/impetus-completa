'use strict';

/**
 * SEC-21C — Segurança operacional (hardening, anti-scanner, UFW, SSH).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const flags = require('../config/securityGoLiveValidationFlags');

const REPO = path.resolve(__dirname, '../../../../');
const DOCS = path.resolve(__dirname, '../../../docs');

function safeExec(cmd, timeoutMs = 5000) {
  try {
    return { ok: true, output: execSync(cmd, { encoding: 'utf8', timeout: timeoutMs }).trim() };
  } catch (e) {
    return { ok: false, output: (e.stdout || e.stderr || '').toString().trim() };
  }
}

function validateSecurityReadiness() {
  const blocking = [];
  const checks = {};

  checks.nginxHardening = fs.existsSync(path.join(REPO, 'infra/nginx/impetus-hardening-locations.conf'));
  checks.nginxProduction = fs.existsSync(path.join(REPO, 'infra/nginx/impetus-production.conf'));

  let antiScannerReady = false;
  try {
    const sec15 = require('../../securityAntiScanner');
    const p = sec15.getAuditPayload?.();
    antiScannerReady = !!p && p.ok !== false;
  } catch (_e) {
    antiScannerReady = false;
  }
  checks.antiScannerPresent = antiScannerReady;

  if (!flags.skipInfraProbes()) {
    checks.ufw = safeExec('ufw status 2>/dev/null | head -3');
    checks.ufwActive = checks.ufw.ok && /active|ativado/i.test(checks.ufw.output || '');

    checks.sshHardening = fs.existsSync('/etc/ssh/sshd_config.d/99-impetus-hardening.conf');

    checks.nginxRateLimit = false;
    try {
      const ngx = fs.readFileSync(path.join(REPO, 'infra/nginx/impetus-production.conf'), 'utf8');
      checks.nginxRateLimit = /limit_req|rate/.test(ngx);
    } catch (_e) {
      /* ignore */
    }

    checks.logsDir = fs.existsSync(path.join(REPO, 'backend/logs')) || fs.existsSync('/var/log/nginx');

    if (!checks.ufwActive) blocking.push({ code: 'UFW_NOT_ACTIVE' });
    if (!checks.sshHardening) blocking.push({ code: 'SSH_HARDENING_MISSING' });
  } else {
    checks.skipped = true;
    checks.ufwActive = true;
    checks.sshHardening = fs.existsSync('/etc/ssh/sshd_config.d/99-impetus-hardening.conf');
    checks.nginxRateLimit = true;
    checks.logsDir = true;
  }

  if (!checks.nginxHardening) blocking.push({ code: 'NGINX_HARDENING_MISSING' });
  if (!antiScannerReady) blocking.push({ code: 'ANTI_SCANNER_NOT_READY' });

  let exfilReady = false;
  let correlationReady = false;
  try {
    exfilReady = require('../../securityExfiltrationDetection').getAuditPayload?.()?.ok !== false;
    correlationReady = require('../../securityCorrelation').getAuditPayload?.()?.ok !== false;
  } catch (_e) {
    /* ignore */
  }
  checks.exfiltrationDetection = exfilReady;
  checks.incidentCorrelation = correlationReady;

  const sec20 = path.join(DOCS, 'evidence/sec-20/certification-latest.json');
  checks.sec20Certified = fs.existsSync(sec20);

  const securityReady =
    checks.nginxHardening &&
    antiScannerReady &&
    exfilReady &&
    correlationReady &&
    checks.sec20Certified &&
    blocking.length === 0;

  return {
    ok: securityReady,
    blocking: blocking.length > 0,
    securityReady,
    incidentResponseChainReady: exfilReady && correlationReady && antiScannerReady,
    checks,
    blockingFindings: blocking
  };
}

module.exports = { validateSecurityReadiness };
