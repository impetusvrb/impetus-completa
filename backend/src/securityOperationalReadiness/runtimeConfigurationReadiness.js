'use strict';

/**
 * APPSEC-02A — Runtime Configuration Readiness (read-only; nunca corrige).
 */

const fs = require('fs');
const path = require('path');
const { readEnvFile } = require('../services/audit/ioeContinuousIngestionCheckpointService');

const SEVERITY = Object.freeze({
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
});

function finding(severity, code, message, evidence = {}) {
  return { severity, code, message, evidence, auto_fix: false };
}

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function resolveEnv(key, envFileVars, alt) {
  if (process.env[key] !== undefined && String(process.env[key]).trim() !== '') return process.env[key];
  if (alt && process.env[alt] !== undefined && String(process.env[alt]).trim() !== '') return process.env[alt];
  if (envFileVars[key] !== undefined && String(envFileVars[key]).trim() !== '') return envFileVars[key];
  if (alt && envFileVars[alt] !== undefined && String(envFileVars[alt]).trim() !== '') return envFileVars[alt];
  return '';
}

/**
 * @param {object} [options]
 */
function validateRuntimeConfigurationReadiness(options = {}) {
  const root = options.repoRoot || path.join(__dirname, '../../..');
  const backendRoot = path.join(root, 'backend');
  const envFileVars = readEnvFile(path.join(backendRoot, '.env'));
  const findings = [];
  const nodeEnv = resolveEnv('NODE_ENV', envFileVars) || process.env.NODE_ENV || 'unknown';
  const isProd = String(nodeEnv).toLowerCase() === 'production';

  // ── Variáveis obrigatórias ──
  const required = [
    { key: 'JWT_SECRET', minLen: 16, severity: SEVERITY.CRITICAL },
    { key: 'IMPETUS_ADMIN_JWT_SECRET', minLen: 16, severity: SEVERITY.CRITICAL },
    { key: 'TIME_CLOCK_ENC_KEY', alt: 'ENCRYPTION_KEY', minLen: 16, severity: SEVERITY.HIGH }
  ];

  for (const spec of required) {
    const val = resolveEnv(spec.key, envFileVars, spec.alt);
    if (!String(val || '').trim()) {
      findings.push(finding(spec.severity, `${spec.key}_MISSING`, `${spec.key} ausente`, { key: spec.key, source: 'env_file' }));
    } else if (val.length < spec.minLen) {
      findings.push(finding(spec.severity, `${spec.key}_WEAK`, `${spec.key} demasiado curto`, { length: val.length }));
    } else if (/impetus-default-key|changeme|dev-secret/i.test(val)) {
      findings.push(finding(SEVERITY.CRITICAL, `${spec.key}_INSECURE`, `${spec.key} usa valor previsível`));
    }
  }

  if (isProd && /^false$/i.test(String(resolveEnv('LICENSE_VALIDATION_ENABLED', envFileVars)).trim())) {
    findings.push(finding(SEVERITY.HIGH, 'LICENSE_VALIDATION_DISABLED', 'LICENSE_VALIDATION_ENABLED=false em produção'));
  }

  if (/^(1|true|yes)$/i.test(String(resolveEnv('ADMIN_PORTAL_DEBUG_INVITE_LINK', envFileVars)).trim())) {
    findings.push(finding(isProd ? SEVERITY.HIGH : SEVERITY.MEDIUM, 'DEBUG_INVITE_ENABLED', 'ADMIN_PORTAL_DEBUG_INVITE_LINK=true'));
  }

  if (/^(1|true|yes)$/i.test(String(resolveEnv('IMPETUS_ALLOW_TOKEN_IN_QUERY', envFileVars)).trim())) {
    findings.push(finding(SEVERITY.HIGH, 'TOKEN_IN_QUERY', 'IMPETUS_ALLOW_TOKEN_IN_QUERY=true'));
  }

  // ── CORS ──
  const origins = String(resolveEnv('ALLOWED_ORIGINS', envFileVars));
  if (isProd && /http:\/\//i.test(origins) && !/localhost|127\.0\.0\.1/.test(origins)) {
    findings.push(finding(SEVERITY.MEDIUM, 'CORS_HTTP_ORIGIN', 'ALLOWED_ORIGINS contém HTTP não-local em produção'));
  }

  // ── Helmet / server.js ──
  const serverJs = readFileSafe(path.join(backendRoot, 'src/server.js'));
  if (serverJs && !/helmet\(/.test(serverJs)) {
    findings.push(finding(SEVERITY.HIGH, 'HELMET_MISSING', 'Helmet não detectado em server.js'));
  }

  // ── Nginx HSTS ──
  const nginxPaths = [
    path.join(root, 'infra/nginx/impetus.conf'),
    path.join(root, 'docker/nginx/impetus-enterprise.conf')
  ];
  let hstsFound = false;
  for (const np of nginxPaths) {
    const c = readFileSafe(np);
    if (c && /Strict-Transport-Security/i.test(c)) {
      hstsFound = true;
      break;
    }
  }
  const securityJs = readFileSafe(path.join(backendRoot, 'src/config/security.js'));
  if (!hstsFound && securityJs && !/strictTransportSecurity|hsts/i.test(securityJs)) {
    findings.push(finding(SEVERITY.MEDIUM, 'HSTS_NOT_CONFIGURED', 'HSTS não encontrado em Nginx nem Helmet explícito'));
  }

  // ── PM2 ──
  try {
    const { execSync } = require('child_process');
    const pm2 = execSync('pm2 jlist 2>/dev/null || echo "[]"', { encoding: 'utf8', timeout: 10000 });
    const list = JSON.parse(pm2 || '[]');
    const backend = list.find((p) => /impetus-backend/i.test(p.name || ''));
    if (!backend) {
      findings.push(finding(SEVERITY.MEDIUM, 'PM2_BACKEND_MISSING', 'Processo impetus-backend não encontrado no PM2'));
    } else if (backend.pm2_env?.status !== 'online' && backend.pm2_env?.pm_uptime !== undefined) {
      findings.push(finding(SEVERITY.HIGH, 'PM2_BACKEND_DOWN', `impetus-backend status: ${backend.pm2_env?.status}`));
    }
  } catch {
    findings.push(finding(SEVERITY.LOW, 'PM2_CHECK_SKIP', 'PM2 não disponível para validação'));
  }

  const bySeverity = {
    critical: findings.filter((f) => f.severity === SEVERITY.CRITICAL).length,
    high: findings.filter((f) => f.severity === SEVERITY.HIGH).length,
    medium: findings.filter((f) => f.severity === SEVERITY.MEDIUM).length,
    low: findings.filter((f) => f.severity === SEVERITY.LOW).length
  };

  return {
    schema_version: 'runtime_config_readiness_v1',
    generated_at: new Date().toISOString(),
    node_env: nodeEnv,
    env_file_path: envFileVars._path,
    env_file_exists: envFileVars._file_exists === 'true',
    findings,
    summary: bySeverity,
    passed: bySeverity.critical === 0 && bySeverity.high === 0,
    auto_fix_applied: false
  };
}

module.exports = {
  SEVERITY,
  validateRuntimeConfigurationReadiness
};
