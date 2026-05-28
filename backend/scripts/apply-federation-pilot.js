#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../.env');

function log(msg) {
  console.log(`[FEDERATION_PROMOTION] ${msg}`);
}

function validateEnv() {
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  if (!/IMPETUS_FEDERATION_ENABLED=true/.test(content)) throw new Error('IMPETUS_FEDERATION_ENABLED deve ser true');
  if (!/IMPETUS_FEDERATION_MODE=audit/.test(content)) throw new Error('IMPETUS_FEDERATION_MODE deve ser audit');
  log('.env OK');
}

async function main() {
  log('Início');
  validateEnv();
  log('pm2 restart impetus-backend --update-env');
  execSync('pm2 restart impetus-backend --update-env', { stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 6000));
  execSync('node scripts/verify-federation-evidence.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
  log('Concluído');
}

main().catch((e) => {
  console.error(`[FEDERATION_PROMOTION] Falha: ${e.message}`);
  process.exit(1);
});
