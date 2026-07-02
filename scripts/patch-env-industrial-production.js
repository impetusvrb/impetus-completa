'use strict';

/**
 * Patch backend/.env para operação industrial real (sem interacção).
 * Uso: node scripts/patch-env-industrial-production.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'backend/.env');
const PUBLIC_HOST = 'srv1422313.hstgr.cloud';

function readEnv(file) {
  return fs.readFileSync(file, 'utf8');
}

function writeEnv(file, content) {
  fs.writeFileSync(file, content, 'utf8');
}

function setKv(lines, key, val) {
  const re = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${val}`;
  if (re.test(lines)) return lines.replace(re, line);
  return `${lines.replace(/\n?$/, '\n')}${line}\n`;
}

function main() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error('backend/.env não encontrado');
    process.exit(1);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const backup = `${ENV_PATH}.bak-patch-${ts}`;
  fs.copyFileSync(ENV_PATH, backup);

  let env = readEnv(ENV_PATH);

  const origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    `https://${PUBLIC_HOST}`,
    `http://${PUBLIC_HOST}`
  ].join(',');

  const patches = {
    NODE_ENV: 'production',
    FRONTEND_URL: `https://${PUBLIC_HOST}`,
    ALLOWED_ORIGINS: origins,
    IMPETUS_INDUSTRIAL_BACKBONE_PILOT_TENANTS: '',
    IMPETUS_INDUSTRIAL_BACKPRESSURE_PILOT_ONLY: 'false',
    IMPETUS_REFRESH_TOKENS_ENABLED: 'true',
    IMPETUS_AIOI_OUTBOX_WORKER_ENABLED: 'true',
    IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED: 'true',
    IMPETUS_EVENT_PIPELINE_ENABLED: 'true',
    IMPETUS_INDUSTRIAL_EVENTS_ENABLED: 'true',
    IMPETUS_INDUSTRIAL_BACKBONE_MODE: 'on'
  };

  for (const [k, v] of Object.entries(patches)) {
    env = setKv(env, k, v);
  }

  writeEnv(ENV_PATH, env);
  console.log(JSON.stringify({ ok: true, backup, patched: Object.keys(patches) }));
}

main();
