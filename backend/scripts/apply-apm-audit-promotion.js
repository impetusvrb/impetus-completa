#!/usr/bin/env node
'use strict';

/**
 * Aplicação controlada da promoção APM shadow→audit.
 * 1) Valida .env
 * 2) Executa verify-apm-audit-evidence.js
 * 3) Reinicia PM2 com --update-env (reload graceful do processo Node)
 *
 * Uso: node scripts/apply-apm-audit-promotion.js [--skip-pm2]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ENV_PATH = path.join(__dirname, '../.env');
const SKIP_PM2 = process.argv.includes('--skip-pm2');

const REQUIRED = {
  IMPETUS_OBSERVABILITY_V2_ENABLED: 'true',
  IMPETUS_APM_ENTERPRISE_ENABLED: 'true',
  IMPETUS_APM_ENTERPRISE_MODE: 'audit',
  IMPETUS_APM_SHADOW_MODE: 'false',
  IMPETUS_OTEL_EXPORTER_ENABLED: 'false',
  IMPETUS_APM_SAMPLING_RATE: '0.1',
};

function parseEnvFile(content) {
  const map = {};
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx < 0) continue;
    map[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return map;
}

function main() {
  console.info('[APM_PROMOTION] Início — validação .env');
  const envContent = fs.readFileSync(ENV_PATH, 'utf8');
  const env = parseEnvFile(envContent);
  const mismatches = [];

  for (const [key, expected] of Object.entries(REQUIRED)) {
    const actual = env[key];
    if (actual !== expected) {
      mismatches.push({ key, expected, actual: actual ?? '(missing)' });
    }
  }

  if (mismatches.length) {
    console.error(JSON.stringify({ ok: false, step: 'env_validation', mismatches }, null, 2));
    process.exit(1);
  }

  console.info('[APM_PROMOTION] .env OK — executando verificação pós-restart necessária');

  if (!SKIP_PM2) {
    console.info('[APM_PROMOTION] pm2 restart impetus-backend --update-env');
    try {
      execSync('pm2 restart impetus-backend --update-env', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
    } catch (err) {
      console.error('[APM_PROMOTION] PM2 restart falhou:', err.message);
      process.exit(1);
    }
    console.info('[APM_PROMOTION] Aguardando boot (5s)...');
    execSync('sleep 5', { stdio: 'inherit' });
  }

  console.info('[APM_PROMOTION] Executando verify-apm-audit-evidence.js');
  try {
    execSync('node scripts/verify-apm-audit-evidence.js', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
  } catch {
    process.exit(1);
  }

  console.info('[APM_PROMOTION] Concluído com sucesso');
}

main();
