'use strict';

/**
 * SEC-04 — Configuration validation (nginx, SSH, env, feature flags).
 * Read-only.
 */

const fs = require('fs');
const { resolvePath } = require('../baseline/baselineLoader');
const { sha256File } = require('./hashValidator');

const CRITICAL_ENV_CHECKS = [
  { key: 'LISTEN_HOST', expected: '127.0.0.1', severity: 'CRITICAL' },
  { key: 'NODE_ENV', expected: 'production', severity: 'WARNING', optional: true }
];

const FEATURE_FLAGS_OFF = [
  'SECURITY_OBSERVATORY',
  'SECURITY_CORRELATION_ENGINE',
  'SECURITY_THREAT_INTELLIGENCE',
  'SECURITY_RUNTIME_INTEGRITY'
];

/**
 * @param {object} baseline
 * @param {object} [ctx] — mock: { env: {}, nginxHash, sshHash, ufwContent }
 */
function validateConfiguration(baseline, ctx = {}) {
  const findings = [];
  const env = ctx.env || process.env;

  for (const check of CRITICAL_ENV_CHECKS) {
    const val = env[check.key];
    if (check.optional && (val == null || val === '')) continue;
    if (val != null && val !== '' && val !== check.expected) {
      findings.push({
        severity: check.severity,
        code: 'ENV_DRIFT',
        key: check.key,
        expected: check.expected,
        actual: val,
        message: `${check.key} diverge da baseline`
      });
    }
  }

  for (const flag of FEATURE_FLAGS_OFF) {
    const val = env[flag];
    if (val != null && String(val).toLowerCase() === 'true') {
      findings.push({
        severity: 'INFO',
        code: 'FEATURE_FLAG_ON',
        key: flag,
        message: `${flag}=true (activo — não é drift, apenas registo)`
      });
    }
  }

  const nginxEntry = (baseline.criticalFiles || []).find((f) => f.path.includes('nginx/sites-available/impetus'));
  if (nginxEntry) {
    const nginxPath = resolvePath(nginxEntry.path);
    if (ctx.nginxHash != null) {
      if (ctx.nginxHash !== nginxEntry.hash) {
        findings.push({
          severity: 'CRITICAL',
          code: 'NGINX_CONFIG_DRIFT',
          path: nginxEntry.path,
          message: 'Configuração Nginx alterada face à baseline'
        });
      }
    } else if (fs.existsSync(nginxPath)) {
      try {
        if (sha256File(nginxPath) !== nginxEntry.hash) {
          findings.push({
            severity: 'CRITICAL',
            code: 'NGINX_CONFIG_DRIFT',
            path: nginxEntry.path,
            message: 'Configuração Nginx alterada face à baseline'
          });
        }
      } catch (_e) {}
    } else {
      findings.push({ severity: 'CRITICAL', code: 'NGINX_MISSING', path: nginxEntry.path, message: 'Nginx config ausente' });
    }
  }

  const sshEntry = (baseline.criticalFiles || []).find((f) => f.path.includes('sshd_config'));
  if (sshEntry) {
    const sshPath = resolvePath(sshEntry.path);
    if (ctx.sshHash != null) {
      if (ctx.sshHash !== sshEntry.hash) {
        findings.push({ severity: 'WARNING', code: 'SSH_CONFIG_DRIFT', path: sshEntry.path, message: 'SSH hardening alterado' });
      }
    } else if (fs.existsSync(sshPath)) {
      try {
        if (sha256File(sshPath) !== sshEntry.hash) {
          findings.push({ severity: 'WARNING', code: 'SSH_CONFIG_DRIFT', path: sshEntry.path, message: 'SSH hardening alterado' });
        }
      } catch (_e) {}
    }
  }

  const ufwContent = ctx.ufwContent != null ? ctx.ufwContent : readUfwStatus();
  if (baseline.ufwSnapshot && ufwContent) {
    const baselineLines = baseline.ufwSnapshot.split('\n').filter((l) => l.match(/^\[\s*\d+\]/)).sort();
    const currentLines = ufwContent.split('\n').filter((l) => l.match(/^\[\s*\d+\]/)).sort();
    if (JSON.stringify(baselineLines) !== JSON.stringify(currentLines)) {
      findings.push({
        severity: 'WARNING',
        code: 'UFW_DRIFT',
        message: 'Regras UFW divergem da baseline (pode ser intencional)'
      });
    }
  }

  if (!fs.existsSync(resolvePath('backend/.env.example'))) {
    findings.push({ severity: 'WARNING', code: 'ENV_EXAMPLE_MISSING', message: 'backend/.env.example ausente' });
  }

  const critical = findings.filter((f) => f.severity === 'CRITICAL');
  const passed = critical.length === 0;
  const status = critical.length > 0 ? 'DEGRADED' : findings.length > 0 ? 'WARNING' : 'OK';

  return {
    kind: 'configuration',
    status,
    passed,
    findings,
    summary: passed ? 'Configuração conforme baseline' : `${critical.length} drift(s) crítico(s) de configuração`
  };
}

function readUfwStatus() {
  try {
    const { execSync } = require('child_process');
    return execSync('ufw status numbered 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
  } catch (_e) {
    return null;
  }
}

module.exports = { validateConfiguration, CRITICAL_ENV_CHECKS, FEATURE_FLAGS_OFF };
