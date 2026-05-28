#!/usr/bin/env node
'use strict';

/**
 * Aplicação segura — SZ4 Persistence pilot + PM2 --update-env.
 * Uso: node scripts/apply-sz4-persistence-pilot.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../.env');
const REQUIRED = [
  'IMPETUS_SZ4_PERSISTENCE=on',
  'IMPETUS_SZ4_PERSISTENCE_PILOT_ONLY=true',
  'IMPETUS_SZ4_PERSISTENCE_PILOT_TENANTS=',
  'IMPETUS_SZ4_PERSISTENCE_TTL_DAYS=90',
  'IMPETUS_SZ4_PERSISTENCE_REPLAY_ON_BOOT=true',
];

function log(msg) {
  console.log(`[SZ4_PERSISTENCE_PROMOTION] ${msg}`);
}

function validateEnv() {
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  if (!/IMPETUS_SZ4_PERSISTENCE=on/.test(content)) {
    throw new Error('IMPETUS_SZ4_PERSISTENCE deve estar on');
  }
  if (!/IMPETUS_SZ4_PERSISTENCE_PILOT_ONLY=true/.test(content)) {
    throw new Error('IMPETUS_SZ4_PERSISTENCE_PILOT_ONLY deve estar true');
  }
  const pilotMatch = content.match(/IMPETUS_SZ4_PERSISTENCE_PILOT_TENANTS=([^\n]+)/);
  if (!pilotMatch || !pilotMatch[1].trim()) {
    throw new Error('IMPETUS_SZ4_PERSISTENCE_PILOT_TENANTS deve definir pelo menos 1 UUID');
  }
  log('.env OK');
}

async function main() {
  log('Início — validação .env');
  validateEnv();

  log('pm2 restart impetus-backend --update-env');
  execSync('pm2 restart impetus-backend --update-env', { stdio: 'inherit' });

  log('Aguardando boot (6s)...');
  await new Promise((r) => setTimeout(r, 6000));

  log('Executando verify-sz4-persistence-evidence.js');
  execSync('node scripts/verify-sz4-persistence-evidence.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });

  log('Concluído com sucesso');
}

main().catch((e) => {
  console.error(`[SZ4_PERSISTENCE_PROMOTION] Falha: ${e.message}`);
  process.exit(1);
});
