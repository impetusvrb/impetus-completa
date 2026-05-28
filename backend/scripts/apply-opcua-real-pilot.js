#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../.env');

function log(msg) {
  console.log(`[OPCUA_REAL_PROMOTION] ${msg}`);
}

function validateEnv() {
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  if (!/IMPETUS_OPCUA_REAL_ENABLED=true/.test(content)) {
    throw new Error('IMPETUS_OPCUA_REAL_ENABLED deve ser true');
  }
  if (!/IMPETUS_OPCUA_REAL_MODE=audit/.test(content)) {
    throw new Error('IMPETUS_OPCUA_REAL_MODE deve ser audit (piloto)');
  }
  log('.env OK');
}

async function main() {
  log('Início');
  validateEnv();
  log('pm2 restart impetus-backend --update-env');
  execSync('pm2 restart impetus-backend --update-env', { stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 8000));
  execSync('node scripts/verify-opcua-real-evidence.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
  log('Concluído — verificar logs PM2: [OPCUA_REAL_BOOT]');
}

main().catch((e) => {
  console.error(`[OPCUA_REAL_PROMOTION] Falha: ${e.message}`);
  process.exit(1);
});
